import { LoadToolsDev } from './loadToolDev';
import { join } from 'path';
import { readdir } from 'fs/promises';
import type { ToolMapType } from './type';
import { isProd } from '@/constants';
import { MongoSystemPlugin } from '@/mongo/models/plugins';
import { refreshDir } from '@/utils/fs';
import { getLogger, mod } from '@/logger';
import { env } from '@/env';

const logger = getLogger(mod.tool);
import { basePath, toolsDir, UploadToolsS3Path } from './constants';
import { privateS3Server } from '@/s3';
import { stat } from 'fs/promises';
import { getCachedData } from '@/cache';
import { SystemCacheKeyEnum } from '@/cache/type';
import { batch } from '@/utils/parallel';
import { LoadToolsByFilename } from './loadToolProd';

const filterToolList = ['.DS_Store', '.git', '.github', 'node_modules', 'dist', 'scripts'];
const loadInstalledToolTimeoutMs = 15000;

declare global {
  var isIniting: boolean;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Init tools when system starting.
 * Download all pkgs from minio, load sideloaded pkgs
 */
export async function initTools() {
  if (global.isIniting) {
    return systemCache.systemTool.data;
  }
  global.isIniting = true;
  const previousToolMap = global.systemCache?.systemTool?.data;

  try {
    const start = Date.now();
    logger.info('Load tools start');

    await refreshDir(toolsDir);
    // 1. download pkgs into pkg dir
    // 1.1 get tools from mongo
    const toolsInMongo = await MongoSystemPlugin.find({
      type: 'tool'
    }).lean();

    logger.debug(`Tools in mongo: ${toolsInMongo.length}`);
    const toolMap: ToolMapType = new Map();

    // 2 download it to temp dir, and parse it
    await batch(
      8,
      toolsInMongo.map((tool) => async () => {
        try {
          const objectName = `${UploadToolsS3Path}/${tool.toolId}.js`;
          const filepath = await withTimeout(
            privateS3Server.downloadFile({
              downloadPath: toolsDir,
              objectName
            }),
            loadInstalledToolTimeoutMs,
            `[initTools] 下载已安装工具超时 toolId=${tool.toolId} object=${objectName}`
          );
          if (!filepath) {
            logger.warn(
              `[initTools] 私有桶中未找到或未下载到工具模块，已跳过 toolId=${tool.toolId} object=${objectName}`
            );
            return;
          }
          const filename = filepath.replace(`${toolsDir}/`, '');
          const loadedTools = await withTimeout(
            LoadToolsByFilename(filename),
            loadInstalledToolTimeoutMs,
            `[initTools] 解析已安装工具超时 toolId=${tool.toolId} file=${filename}`
          );
          loadedTools.forEach((t) => toolMap.set(t.toolId, t));
        } catch (e) {
          logger.warn(`[initTools] 已安装工具加载失败，已跳过: ${tool.toolId}`, { err: `${e}` });
        }
      })
    );

    // 3. read dev tools, if in dev mode（目录不存在时仅使用 Mongo+S3 安装包，禁止提前 return 导致 isIniting 未复位）
    if (!isProd && !env.DISABLE_DEV_TOOLS) {
      const dir = join(basePath, 'modules', 'tool', 'packages');
      try {
        await stat(dir);
        const dirs = (await readdir(dir)).filter((filename) => !filterToolList.includes(filename));
        const devTools = (
          await Promise.all(
            dirs.map(async (filename) => {
              try {
                return await LoadToolsDev(filename);
              } catch (e) {
                logger.warn(`[initTools] 本地 dev 工具加载失败，已跳过: ${filename}`, {
                  err: `${e}`
                });
                return [];
              }
            })
          )
        ).flat();

        for (const tool of devTools) {
          toolMap.set(tool.toolId, tool);
        }
      } catch (e) {
        logger.warn(`[initTools] 未加载本地 dev 工具目录（可忽略）: ${dir}`, { err: `${e}` });
      }
    }

    if (toolMap.size === 0 && previousToolMap?.size > 0) {
      logger.warn(`[initTools] 本次未成功加载任何工具，保留上一版缓存: ${previousToolMap.size}`);
      return previousToolMap;
    }

    logger.info(`Load tools finish: ${toolMap.size}, time: ${Date.now() - start}ms`);
    return toolMap;
  } catch (e) {
    logger.error(`Load tools Error: ${e}`);
    return getCachedData(SystemCacheKeyEnum.systemTool);
  } finally {
    global.isIniting = false;
  }
}
