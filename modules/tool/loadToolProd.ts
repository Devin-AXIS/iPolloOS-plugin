import { toolsDir } from './constants';
import type { ToolSetType, ToolType } from './type';
import { getLogger, mod } from '@/logger';

const logger = getLogger(mod.tool);
import { join } from 'path';
import { parseMod } from './parseMod';
import { readFile } from 'fs/promises';
import { createHash } from 'node:crypto';

// Load tool or toolset and its children
export const LoadToolsByFilename = async (filename: string): Promise<ToolType[]> => {
  const start = Date.now();

  const filePath = join(toolsDir, filename);

  const fileBuffer = await readFile(filePath);
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex').slice(0, 16);
  // The uploaded tool file path is stable across updates, so the ESM import query must be based
  // on content rather than size. Same-size updates otherwise keep using Node's cached module.
  const modulePath = `${filePath}?v=${fileHash}`;

  const rootMod = (await import(modulePath)).default as ToolType | ToolSetType;

  if (!rootMod.toolId) {
    logger.error(`Can not parse toolId, filename: ${filename}`);
    return [];
  }

  logger.debug(`Load tool ${filename} finish, time: ${Date.now() - start}ms`);

  return parseMod({ rootMod, filename });
};
