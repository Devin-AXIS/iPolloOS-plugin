function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function withRuntimeUserOwner(assignees: unknown, userId: string) {
  const list = Array.isArray(assignees) ? [...assignees] : [];
  const ownerIndex = list.findIndex((item) => {
    if (!isRecord(item)) return false;
    return item.assigneeType === 'user' && item.assigneeId === userId;
  });

  if (ownerIndex >= 0) {
    const owner = list[ownerIndex] as Record<string, unknown>;
    list[ownerIndex] = { ...owner, role: owner.role || 'owner' };
    return list;
  }

  return [{ assigneeType: 'user', assigneeId: userId, role: 'owner' }, ...list];
}

export function withAgentSubtaskExecutors(assignees: unknown, subtasks: unknown) {
  const list = Array.isArray(assignees) ? [...assignees] : [];
  if (!Array.isArray(subtasks)) return list;

  for (const subtask of subtasks) {
    if (!isRecord(subtask)) continue;
    const assigneeType = String(subtask.assigneeType ?? subtask.assignee_type ?? '').trim();
    const assigneeId = String(subtask.assigneeId ?? subtask.assignee_id ?? '').trim();
    if (assigneeType !== 'agent' || !assigneeId) continue;

    const exists = list.some((assignee) => {
      if (!isRecord(assignee)) return false;
      return (
        String(assignee.assigneeType ?? assignee.assignee_type ?? '').trim() === 'agent' &&
        String(assignee.assigneeId ?? assignee.assignee_id ?? assignee.id ?? '').trim() ===
          assigneeId
      );
    });
    if (exists) continue;

    list.push({
      assigneeType: 'agent',
      assigneeId,
      assigneeName: String(subtask.assigneeName ?? subtask.assignee_name ?? '').trim(),
      role: 'executor'
    });
  }

  return list;
}
