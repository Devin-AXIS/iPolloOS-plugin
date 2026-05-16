/** website.* 接口要求 task_id 与 website_id 二选一，不可同时传。 */
export function websiteXorPayload(
  taskId?: string,
  websiteId?: string
): { task_id: string } | { website_id: string } {
  const t = taskId?.trim();
  const w = websiteId?.trim();
  if (t && w) throw new Error('只能填写 task_id 或 website_id 其中之一');
  if (t) return { task_id: t };
  if (w) return { website_id: w };
  throw new Error('请填写 task_id 或 website_id');
}
