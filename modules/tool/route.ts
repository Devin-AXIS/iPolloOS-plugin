import { getCachedData, refreshVersionKey } from '@/cache';
import { SystemCacheKeyEnum } from '@/cache/type';
import { ToolDetailSchema, type ToolDetailType } from './schemas/common';
import { getTool, getToolTags } from '@tool/controller';
import { privateS3Server, publicS3Server } from '@/s3';
import { UploadToolsS3Path, tempPkgDir } from '@tool/constants';
import type { SSEStreamingApi } from 'hono/streaming';
import { streamSSE } from 'hono/streaming';
import { R, createOpenAPIHono } from '@/utils/http';
import { getLogger, mod } from '@/logger';
import { MongoSystemPlugin, pluginTypeEnum } from '@/mongo/models/plugins';
import { mongoSessionRun } from '@/mongo/utils';
import { join } from 'path';
import { batch } from '@/utils/parallel';
import { parsePkg, parseUploadedTool } from '@tool/utils';
import { writeFile } from 'fs/promises';
import { ensureDir } from '@/utils/fs';
import { dispatchWithNewWorker } from 'lib/worker';
import { getErrText } from '@tool/utils/err';
import {
  StreamMessageTypeEnum,
  type StreamDataType,
  type ToolCallbackReturnSchemaType
} from '@tool/type/req';
import { runWithToolContext } from '@tool/utils/context';
import {
  listToolsRoute,
  getTagsRoute,
  getToolRoute,
  getPresignedUploadUrlRoute,
  confirmUploadRoute,
  deleteToolRoute,
  installToolRoute,
  parseUploadedToolRoute,
  runStreamRoute
} from './schemas/routes';

const tools = createOpenAPIHono().basePath('/tools');

const rebuildSystemToolCache = async (logger = getLogger(mod.tool)) => {
  await refreshVersionKey(SystemCacheKeyEnum.systemTool);

  const rebuild = getCachedData(SystemCacheKeyEnum.systemTool).catch((error) => {
    logger.warn('[tools] Rebuild system tool cache failed after mutation', { error: `${error}` });
  });

  await Promise.race([
    rebuild,
    new Promise((resolve) => {
      setTimeout(resolve, 5000);
    })
  ]);
};

/**
 * List tools
 */
tools.openapi(listToolsRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const cache = await getCachedData(SystemCacheKeyEnum.systemTool);
  const data: ToolDetailType[] = [];
  for (const [toolId, item] of cache.entries()) {
    const result = ToolDetailSchema.safeParse(item);
    if (result.success) {
      data.push(result.data);
    } else {
      logger.warn('[listTools] ToolDetailSchema 校验失败，该工具不会出现在列表中', {
        toolId,
        issues: result.error.flatten()
      });
    }
  }

  return c.json(R.success(data));
});

/**
 * Get tags
 */
tools.openapi(getTagsRoute, async (c) => {
  const tags = getToolTags();
  return c.json(R.success(tags));
});

/**
 * Get a tool
 */
tools.openapi(getToolRoute, async (c) => {
  const { toolId } = c.req.valid('param');

  const parsed = ToolDetailSchema.safeParse(await getTool(toolId));
  if (!parsed.success) {
    return c.json(R.error(404, 'Tool not found'), 404);
  }

  return c.json(R.success(parsed.data), 200);
});

/**
 * Get upload URL
 */
tools.openapi(getPresignedUploadUrlRoute, async (c) => {
  const { filename } = c.req.valid('query');

  const body = await privateS3Server.generateUploadPresignedURL({
    filepath: UploadToolsS3Path,
    contentType: 'application/zip',
    maxSize: 100 * 1024 * 1024,
    filename,
    fileExpireMins: 60
  });

  return c.json(R.success(body), 200);
});

/**
 * Confirm upload
 */
tools.openapi(confirmUploadRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const { toolIds: _toolIds } = c.req.valid('json');
  const toolIds = [...new Set(_toolIds)];

  logger.debug(`Confirming uploaded tools: ${toolIds}`);

  const failedToolIds: Array<{ toolId: string; error: string }> = [];
  for (const toolId of toolIds) {
    if (!toolId) continue;
    try {
      await publicS3Server.moveFiles(
        `${UploadToolsS3Path}/temp/${toolId}`,
        `${UploadToolsS3Path}/${toolId}`
      );
      await privateS3Server.moveFile(
        `${UploadToolsS3Path}/temp/${toolId}.js`,
        `${UploadToolsS3Path}/${toolId}.js`
      );
    } catch (error) {
      failedToolIds.push({
        toolId,
        error: getErrText(error)
      });
    }
  }

  if (failedToolIds.length > 0) {
    logger.warn('[confirmUpload] Failed to move uploaded tool files', { failedToolIds });
    return c.json(
      R.error(
        400,
        `Failed to confirm uploaded tool files: ${failedToolIds.map((item) => `${item.toolId}: ${item.error}`).join('; ')}`
      ),
      400
    );
  }

  await mongoSessionRun(async (session) => {
    const allToolsInstalled = (
      await MongoSystemPlugin.find({ type: pluginTypeEnum.enum.tool }).lean()
    ).map((tool) => tool.toolId);
    const newTools = toolIds
      .filter((toolId) => !allToolsInstalled.includes(toolId))
      .map((toolId) => ({
        toolId,
        type: pluginTypeEnum.enum.tool
      }));

    if (newTools.length > 0) {
      await MongoSystemPlugin.create(newTools, {
        session,
        ordered: true
      });
    }
  });

  await rebuildSystemToolCache(logger);

  logger.debug(`Confirmed uploaded tools: ${toolIds}`);

  return c.json(R.success({ message: 'ok' }), 200 as const);
});

/**
 * Delete tool
 */
tools.openapi(deleteToolRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const { toolId } = c.req.valid('query');
  const res = await mongoSessionRun(async (session) => {
    const result = await MongoSystemPlugin.findOneAndDelete({ toolId }).session(session);
    if (!result || !result.toolId) {
      return {
        status: 404 as const,
        error: `Tool with toolId ${toolId} not found in MongoDB`
      };
    }
    // Remove public files(Avatar,readme)
    const files = await publicS3Server.getFiles(`${UploadToolsS3Path}/${result.toolId}`);

    await publicS3Server.removeFiles(files);

    // Remove private file(index.js)
    await privateS3Server.removeFile(`${UploadToolsS3Path}/${result.toolId}.js`);
    return null;
  });

  await refreshVersionKey(SystemCacheKeyEnum.systemTool);

  if (res) {
    return c.json(R.error(res.status, res.error), 404);
  }
  logger.debug(`Deleted tool: ${toolId}`);

  return c.json(R.success({ message: 'Tool deleted successfully' }), 200);
});

/**
 * Install tool
 */
tools.openapi(installToolRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const { urls } = c.req.valid('json');
  logger.debug(`Installing tools: ${urls}`);
  await ensureDir(tempPkgDir);
  const downloadFunctions = urls.map((url) => async () => {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const pkgSavePath = join(tempPkgDir, url.split('/').at(-1) as string);
    // Write the buffer directly to file
    await writeFile(pkgSavePath, Buffer.from(buffer));

    const tools = await parsePkg(pkgSavePath, false);
    const tool = tools.find((item) => !item.parentId);
    return tool?.toolId;
  });

  const toolIds = (await batch(5, downloadFunctions)).filter(
    <T>(item: T): item is NonNullable<T> => !!item
  );

  const allToolsInstalled = (
    await MongoSystemPlugin.find({ type: pluginTypeEnum.enum.tool }).lean()
  ).map((tool) => tool.toolId);
  // create all that not exists
  await MongoSystemPlugin.create(
    toolIds
      .filter((toolId) => !allToolsInstalled.includes(toolId))
      .map((toolId) => ({
        toolId,
        type: pluginTypeEnum.enum.tool
      })),
    {
      ordered: true
    }
  );

  await rebuildSystemToolCache(logger);
  logger.info(`Success installed tools: ${toolIds}`);

  return c.json(R.success({ message: 'ok' }), 200);
});

/**
 * Parse uploaded tool
 */
tools.openapi(parseUploadedToolRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const { objectName } = c.req.valid('query');
  logger.debug(`Parsing uploaded tool: ${objectName}`);
  const res = await parseUploadedTool(objectName);

  logger.debug(`Parsed tool: ${res.map((item) => item.toolId)}`);
  return c.json(R.success(res), 200);
});

/**
 * Run tool stream
 */
tools.openapi(runStreamRoute, async (c) => {
  const logger = getLogger(mod.tool);
  const { toolId, inputs, systemVar } = c.req.valid('json');

  const tool = await getTool(toolId);

  if (!tool) {
    logger.error('Tool not found', { body: { toolId } });
    return c.json(R.error(404, 'tool not found'), 404);
  }

  const handleSendError = async (error: unknown, stream: SSEStreamingApi) => {
    logger.error(`Run tool '${toolId}' error: ${error}`, { error });
    await stream.writeSSE({
      data: JSON.stringify({ type: StreamMessageTypeEnum.error, data: getErrText(error) })
    });
  };

  return streamSSE(
    c,
    async (stream) => {
      const handleSend = async (e: StreamDataType) => {
        const data = JSON.stringify({ type: StreamMessageTypeEnum.stream, data: e });
        await stream.writeSSE({ data });
      };

      const handleStreamAbort = () => logger.info(`Stream aborted for tool: ${toolId}`);
      stream.onAbort(handleStreamAbort);

      let result: ToolCallbackReturnSchemaType;
      if (tool.isWorkerRun === true) {
        logger.debug('Run tool start in worker', { body: { toolId, inputs, systemVar } });
        result = await dispatchWithNewWorker({
          toolId,
          inputs,
          systemVar,
          onMessage: handleSend
        });
      } else {
        logger.debug('Run tool start in main thread', { body: { toolId, inputs, systemVar } });
        const context = { prefix: systemVar?.tool?.prefix };
        const executor = () => tool.cb(inputs, { systemVar, streamResponse: handleSend });
        result = await runWithToolContext(context, executor);
      }

      if (result.error) {
        logger.error(`Run tool '${toolId}' failed`, { error: result.error });
        return await handleSendError(result.error, stream);
      }

      logger.debug(`Run tool '${toolId}' success`);
      const data = JSON.stringify({ type: StreamMessageTypeEnum.response, data: result });
      await stream.writeSSE({ data });
    },
    async (error, stream) => {
      await handleSendError(error, stream);
    }
  );
});

export default tools;
