/**
 * 子工具已改为静态维护：supabaseDatabase + supabaseManagement。
 * 构建脚本仍会调用本文件，仅做存在性校验。
 * 运行: bun run scripts/generate-children.ts
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CHILD = join(import.meta.dir, '..', 'children');
const REQUIRED = ['supabaseDatabase', 'supabaseManagement'];

for (const name of REQUIRED) {
  const marker = join(CHILD, name, 'src', 'index.ts');
  if (!existsSync(marker)) {
    throw new Error(`缺少子工具 ${name}（期望 ${marker}）`);
  }
}

console.log('✅ Supabase 聚合子工具就绪:', REQUIRED.join(', '));
