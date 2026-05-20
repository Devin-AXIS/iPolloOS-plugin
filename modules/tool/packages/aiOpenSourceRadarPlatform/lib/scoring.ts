import type { GithubRepo } from './schemas';

function daysSince(value?: string): number {
  if (!value) return 9999;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return 9999;
  return Math.max(0, (Date.now() - t) / (24 * 60 * 60 * 1000));
}

function ageDays(value?: string): number {
  if (!value) return 9999;
  return Math.max(1, Math.round(daysSince(value)));
}

export function repoHotMetrics(repo: GithubRepo) {
  const createdDays = ageDays(repo.created_at);
  const pushedDays = daysSince(repo.pushed_at);
  const stars = repo.stargazers_count ?? 0;
  return {
    createdDays,
    pushedDays,
    starsPerDay: Number((stars / createdDays).toFixed(2))
  };
}

export function scoreRepo(repo: GithubRepo): {
  score: number;
  grade: string;
  reasons: string[];
  risks: string[];
} {
  const pushedDays = daysSince(repo.pushed_at);
  const createdDays = ageDays(repo.created_at);
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const issues = repo.open_issues_count ?? 0;
  const topics = repo.topics ?? [];
  const hasAiTopic = topics.some((t) =>
    /ai|llm|agent|rag|ml|machine-learning|deep-learning/i.test(t)
  );

  let score = 35;
  if (stars >= 10_000) score += 25;
  else if (stars >= 3000) score += 20;
  else if (stars >= 1000) score += 15;
  else if (stars >= 200) score += 10;
  else if (stars >= 50) score += 5;

  if (forks >= 1000) score += 10;
  else if (forks >= 300) score += 7;
  else if (forks >= 50) score += 4;

  if (pushedDays <= 7) score += 15;
  else if (pushedDays <= 30) score += 10;
  else if (pushedDays <= 90) score += 4;
  else score -= 10;

  if (hasAiTopic) score += 8;
  if (createdDays <= 7) score += 10;
  else if (createdDays <= 30) score += 7;
  else if (createdDays <= 90) score += 3;
  const starsPerDay = stars / createdDays;
  if (starsPerDay >= 50) score += 12;
  else if (starsPerDay >= 10) score += 8;
  else if (starsPerDay >= 2) score += 4;
  if (repo.homepage) score += 4;
  if (repo.license?.spdx_id) score += 4;
  if (repo.archived || repo.disabled) score -= 40;
  if (issues > Math.max(200, stars / 10)) score -= 6;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade =
    score >= 85
      ? 'A'
      : score >= 75
        ? 'A-'
        : score >= 65
          ? 'B+'
          : score >= 55
            ? 'B'
            : score >= 45
              ? 'C+'
              : 'C';

  const reasons: string[] = [];
  if (stars) reasons.push(`${stars} stars`);
  if (createdDays <= 90)
    reasons.push(`创建约 ${createdDays} 天，约 ${starsPerDay.toFixed(1)} stars/day`);
  if (forks) reasons.push(`${forks} forks`);
  if (pushedDays <= 30) reasons.push(`最近 ${Math.max(1, Math.round(pushedDays))} 天有更新`);
  if (repo.language) reasons.push(`主要语言 ${repo.language}`);
  if (hasAiTopic) reasons.push('包含 AI/LLM/Agent/RAG 相关 topic');
  if (repo.homepage) reasons.push('提供主页或演示链接');

  const risks: string[] = [];
  if (repo.archived) risks.push('仓库已归档');
  if (pushedDays > 180) risks.push('半年内更新较少');
  if (!repo.license?.spdx_id) risks.push('未识别到明确开源协议');
  if (issues > Math.max(200, stars / 10)) risks.push('open issues 偏多，需要关注维护响应');

  return { score, grade, reasons, risks };
}
