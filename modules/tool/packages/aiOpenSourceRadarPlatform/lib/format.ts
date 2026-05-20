import { repoHotMetrics, scoreRepo } from './scoring';
import type {
  GithubCommit,
  GithubContent,
  GithubContributor,
  GithubRelease,
  GithubRepo,
  GithubTreeItem,
  HnHit
} from './schemas';

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function oneLine(value: unknown): string {
  return clean(value).replace(/\s+/g, ' ');
}

export function formatRepoLine(repo: GithubRepo, index: number): string {
  const scored = scoreRepo(repo);
  const hot = repoHotMetrics(repo);
  const desc = oneLine(repo.description) || '无描述';
  const topics = repo.topics?.length ? `\n  Topics：${repo.topics.slice(0, 8).join(', ')}` : '';
  const risks = scored.risks.length ? `\n  风险：${scored.risks.join('；')}` : '';
  return `${index}. ${repo.full_name}（${scored.grade} / ${scored.score}）\n  ${desc}\n  Stars：${repo.stargazers_count} · Forks：${repo.forks_count} · Issues：${repo.open_issues_count} · Language：${repo.language ?? 'unknown'}\n  Created：${repo.created_at ?? ''} · Updated：${repo.pushed_at ?? repo.updated_at ?? ''} · Stars/day：${hot.starsPerDay}\n  推荐理由：${scored.reasons.join('；') || '指标有限，建议进一步分析'}${risks}${topics}\n  ${repo.html_url}`;
}

export function formatDiscoverMarkdown(
  repos: GithubRepo[],
  meta: { query: string; totalCount: number; incomplete: boolean },
  updatedRepos: GithubRepo[] = [],
  updatedMeta?: { query: string; totalCount: number; incomplete: boolean }
): string {
  if (!repos.length && !updatedRepos.length) {
    return `未找到匹配的 GitHub AI 开源项目。\n\n新项目查询：${meta.query}${updatedMeta ? `\n更新项目查询：${updatedMeta.query}` : ''}`;
  }

  const lines = [
    '# AI 开源项目推荐',
    '',
    '## 新发布项目',
    '',
    `查询：${meta.query}`,
    `GitHub 命中约 ${meta.totalCount} 个新项目结果${meta.incomplete ? '（GitHub 标记结果可能不完整）' : ''}。主推荐优先看时间范围内新创建且有更新的项目。`
  ];

  if (repos.length) {
    lines.push('', ...repos.map((repo, i) => formatRepoLine(repo, i + 1)));
  } else {
    lines.push('', '这个时间范围内没有找到匹配的新发布项目。');
  }

  if (updatedMeta) {
    lines.push(
      '',
      '## 近期值得注意的更新',
      '',
      `查询：${updatedMeta.query}`,
      `GitHub 命中约 ${updatedMeta.totalCount} 个近期更新结果${updatedMeta.incomplete ? '（GitHub 标记结果可能不完整）' : ''}。这部分是补充项，偏成熟项目最近更新，不等同于新发布项目。`
    );
    if (updatedRepos.length) {
      lines.push('', ...updatedRepos.map((repo, i) => formatRepoLine(repo, i + 1)));
    } else {
      lines.push('', '未找到明显值得附带的近期更新项目。');
    }
  }

  return lines.join('\n\n');
}

export function formatDiscoverMarkdownOld(
  repos: GithubRepo[],
  meta: { query: string; totalCount: number; incomplete: boolean }
): string {
  if (!repos.length) return `未找到匹配的 GitHub AI 开源项目。\n\n查询：${meta.query}`;
  return [
    '# AI 开源项目推荐',
    '',
    `查询：${meta.query}`,
    `GitHub 命中约 ${meta.totalCount} 个结果${meta.incomplete ? '（GitHub 标记结果可能不完整）' : ''}。评分是启发式判断，建议对重点项目继续调用项目识别分析。`,
    '',
    ...repos.map((repo, i) => formatRepoLine(repo, i + 1))
  ].join('\n\n');
}

export function formatSourceLinks(repos: GithubRepo[]): string {
  return repos.map((repo, i) => `${i + 1}. ${repo.full_name} - ${repo.html_url}`).join('\n');
}

function inferArchitecture(contents: GithubContent[], readme: string): string[] {
  const names = contents.map((item) => item.name);
  const hints: string[] = [];
  const has = (re: RegExp) => names.some((name) => re.test(name)) || re.test(readme);

  if (has(/package\.json|pnpm-lock|yarn\.lock|next\.config|vite\.config/i))
    hints.push('包含 Node/TypeScript/前端或全栈应用结构。');
  if (has(/pyproject\.toml|requirements\.txt|setup\.py|uv\.lock/i))
    hints.push('包含 Python 包或服务结构。');
  if (has(/Dockerfile|docker-compose/i)) hints.push('提供 Docker 部署线索。');
  if (has(/src|packages|apps|services/i))
    hints.push('存在模块化源码目录，适合继续深入目录级分析。');
  if (has(/examples|demo|docs/i)) hints.push('包含示例或文档目录。');
  if (has(/agent|tool|workflow|rag|retriev|model|llm/i))
    hints.push('README 或目录中出现 Agent/工具/RAG/模型相关模块线索。');

  return hints.length ? hints : ['根目录信号有限，需要进一步读取 README 与子目录文件确认架构。'];
}

function percentMap(values: Record<string, number>): string {
  const total = Object.values(values).reduce((sum, v) => sum + v, 0);
  if (!total) return '未读取到语言统计。';
  return Object.entries(values)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => `${name} ${((bytes / total) * 100).toFixed(1)}%`)
    .join(' · ');
}

function topDirs(tree: GithubTreeItem[]): string[] {
  const counts = new Map<string, number>();
  tree.forEach((item) => {
    const [dir] = item.path.split('/');
    if (!dir || item.path === dir) return;
    if (/^(node_modules|dist|build|coverage|\.git|\.next|vendor)$/i.test(dir)) return;
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([dir, count]) => `${dir}(${count})`);
}

function importantFiles(tree: GithubTreeItem[]): string[] {
  const patterns = [
    /(^|\/)package\.json$/,
    /(^|\/)pyproject\.toml$/,
    /(^|\/)requirements\.txt$/,
    /(^|\/)Dockerfile$/,
    /(^|\/)docker-compose\.ya?ml$/,
    /(^|\/)README/i,
    /(^|\/)docs?\//,
    /(^|\/)examples?\//,
    /(^|\/)src\//,
    /(^|\/)packages?\//,
    /(^|\/)apps?\//,
    /(^|\/)server\//,
    /(^|\/)api\//,
    /(^|\/)agent/i,
    /(^|\/)workflow/i,
    /(^|\/)tools?\//,
    /(^|\/)eval/i,
    /(^|\/)tests?\//
  ];
  return tree
    .filter((item) => item.type === 'blob' && patterns.some((re) => re.test(item.path)))
    .map((item) => item.path)
    .slice(0, 60);
}

function inferTechArchitecture(
  tree: GithubTreeItem[],
  readme: string,
  languages: Record<string, number>,
  sampledFiles: Record<string, string>
): string[] {
  const paths = tree.map((item) => item.path);
  const allText =
    `${readme}\n${Object.values(sampledFiles).join('\n')}\n${paths.join('\n')}`.toLowerCase();
  const lines: string[] = [];

  if (languages.TypeScript || languages.JavaScript)
    lines.push('前端/Node 生态明显，可能包含 Web UI、SDK、服务端 API 或 Agent 编排层。');
  if (languages.Python)
    lines.push(
      'Python 占比较高，通常意味着模型调用、训练/推理、数据处理或 Agent runtime 是核心部分。'
    );
  if (paths.some((p) => /^packages?\//.test(p) || /^apps?\//.test(p)))
    lines.push('存在 monorepo 或多包结构，项目可能拆分为应用、SDK、服务和共享模块。');
  if (paths.some((p) => /docker|compose|k8s|helm/i.test(p)))
    lines.push('包含容器化/部署配置，具备一定落地部署意识。');
  if (/agent|multi-agent|planner|executor|tool use|function calling/.test(allText))
    lines.push('包含 Agent/工具调用/规划执行相关线索，值得重点阅读执行链路和工具抽象。');
  if (/rag|retriev|embedding|vector|knowledge/.test(allText))
    lines.push('包含 RAG/检索/向量知识库线索，重点关注数据摄取、索引、召回和重排模块。');
  if (/eval|benchmark|test/.test(allText))
    lines.push('存在测试、评测或 benchmark 线索，代码可信度和可复现实验价值更高。');
  if (/plugin|extension|connector|mcp/.test(allText))
    lines.push('有插件/连接器/MCP 类扩展线索，适合作为工具生态或能力市场参考。');

  return lines.length ? lines : ['架构信号有限；建议继续读取核心源码文件后再判断。'];
}

function architectureDiagram(
  tree: GithubTreeItem[],
  languages: Record<string, number>,
  sampledFiles: Record<string, string>
): string {
  const paths = tree.map((item) => item.path);
  const text = Object.values(sampledFiles).join('\n').toLowerCase();
  const hasUi =
    paths.some((p) => /(^|\/)(app|apps|web|frontend|ui|pages|components)\//i.test(p)) ||
    languages.TypeScript ||
    languages.JavaScript;
  const hasApi = paths.some((p) => /(^|\/)(api|server|backend|service|routes)\//i.test(p));
  const hasAgent =
    paths.some((p) => /agent|planner|executor|workflow|tools?\//i.test(p)) ||
    /agent|planner|executor|workflow|tool use/.test(text);
  const hasData =
    paths.some((p) => /rag|retriev|embedding|vector|knowledge|database|db\//i.test(p)) ||
    /rag|retriev|embedding|vector|knowledge/.test(text);
  const hasModel =
    paths.some((p) => /model|llm|provider|openai|anthropic|inference/i.test(p)) ||
    /openai|anthropic|llm|model provider|inference/.test(text);
  const hasEval =
    paths.some((p) => /eval|benchmark|tests?\//i.test(p)) ||
    /eval|benchmark|pytest|vitest|jest/.test(text);

  const lines = ['```mermaid', 'flowchart LR', '  User["User / Developer"]'];
  if (hasUi) lines.push('  UI["UI / CLI / SDK"]');
  if (hasApi) lines.push('  API["API / Server Layer"]');
  if (hasAgent) lines.push('  Agent["Agent Orchestration\\nPlanner / Executor / Tools"]');
  if (hasData) lines.push('  Data["Data / Retrieval Layer\\nRAG / Vector / Knowledge"]');
  if (hasModel) lines.push('  Model["Model Providers\\nLLM / Inference"]');
  if (hasEval) lines.push('  Eval["Tests / Eval / Benchmark"]');
  lines.push('  Repo["Repository Modules"]');

  if (hasUi) lines.push('  User --> UI');
  else lines.push('  User --> Repo');
  if (hasUi && hasApi) lines.push('  UI --> API');
  if (hasApi && hasAgent) lines.push('  API --> Agent');
  else if (hasUi && hasAgent) lines.push('  UI --> Agent');
  else if (hasAgent) lines.push('  User --> Agent');
  if (hasAgent && hasData) lines.push('  Agent --> Data');
  if (hasAgent && hasModel) lines.push('  Agent --> Model');
  if (!hasAgent && hasModel) lines.push('  Repo --> Model');
  if (hasEval) lines.push('  Eval -. validates .-> Repo');
  lines.push('  Repo --> ' + (hasAgent ? 'Agent' : hasApi ? 'API' : hasUi ? 'UI' : 'User'));
  lines.push('```');
  return lines.join('\n');
}

function formatContributors(contributors: GithubContributor[]): string {
  if (!contributors.length) return '未读取到贡献者列表。';
  const total = contributors.reduce((sum, item) => sum + (item.contributions ?? 0), 0);
  return contributors
    .slice(0, 10)
    .map((item, index) => {
      const share = total ? `，约 ${(((item.contributions ?? 0) / total) * 100).toFixed(1)}%` : '';
      return `${index + 1}. ${item.login ?? 'unknown'}：${item.contributions ?? 0} commits${share}${item.html_url ? ` · ${item.html_url}` : ''}`;
    })
    .join('\n');
}

function formatCommitCadence(commits: GithubCommit[]): string {
  if (!commits.length) return '未读取到最近提交。';
  const dates = commits
    .map((item) => item.commit?.author?.date)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter(Number.isFinite);
  const newest = dates.length ? new Date(Math.max(...dates)).toISOString() : '';
  const oldest = dates.length ? new Date(Math.min(...dates)).toISOString() : '';
  return `最近读取 ${commits.length} 条提交；最新 ${newest || '未知'}，最早 ${oldest || '未知'}。`;
}

function codeValueJudgement(input: {
  repo: GithubRepo;
  tree: GithubTreeItem[];
  languages: Record<string, number>;
  contributors: GithubContributor[];
  sampledFiles: Record<string, string>;
}): string[] {
  const { repo, tree, languages, contributors, sampledFiles } = input;
  const paths = tree.map((item) => item.path);
  const text = Object.values(sampledFiles).join('\n').toLowerCase();
  const result: string[] = [];

  if ((repo.stargazers_count ?? 0) >= 1000 && contributors.length >= 5) {
    result.push('社区基础较好，且不是单一贡献者完全支撑，适合纳入持续观察。');
  } else if (contributors.length <= 2) {
    result.push('贡献者集中度较高，维护连续性需要进一步观察。');
  }
  if (paths.some((p) => /^examples?\//.test(p)) || /quickstart|example|demo/.test(text)) {
    result.push('示例/quickstart 信号较强，学习和 PoC 成本较低。');
  }
  if (
    paths.some((p) => /^tests?\//.test(p) || /\/tests?\//.test(p)) ||
    /vitest|pytest|jest|unittest/.test(text)
  ) {
    result.push('存在测试或测试框架线索，代码质量判断更有依据。');
  } else {
    result.push('暂未看到明显测试目录或测试框架线索，生产接入前需要额外验证。');
  }
  if (languages.Python && (languages.TypeScript || languages.JavaScript)) {
    result.push(
      '同时包含 Python 与前端/Node 生态，可能是“模型/Agent runtime + Web/SDK”的完整应用型项目。'
    );
  }
  if (paths.some((p) => /docker/i.test(p))) {
    result.push('包含 Docker 相关文件，部署落地性优于纯代码示例项目。');
  }

  return result;
}

function innovationJudgement(input: {
  repo: GithubRepo;
  readme: string;
  tree: GithubTreeItem[];
  sampledFiles: Record<string, string>;
}): string[] {
  const text =
    `${input.readme}\n${Object.values(input.sampledFiles).join('\n')}\n${input.tree.map((item) => item.path).join('\n')}`.toLowerCase();
  const points: string[] = [];
  if (/multi-agent|multi agent|agentic|planner|executor/.test(text)) {
    points.push(
      'Agent 编排或多智能体方向明显，创新点可能集中在任务拆解、执行器、工具调用和状态管理。'
    );
  }
  if (/mcp|model context protocol|connector|plugin/.test(text)) {
    points.push('连接器/插件/MCP 信号明显，价值在于扩展生态和工具接入，而不只是单点模型调用。');
  }
  if (/rag|retrieval|embedding|vector|rerank/.test(text)) {
    points.push('包含 RAG/检索增强链路，创新价值需要重点看召回、重排、上下文组织和数据接入体验。');
  }
  if (/browser|computer use|automation|playwright|puppeteer/.test(text)) {
    points.push('浏览器/自动化能力明显，适合关注任务执行可靠性、页面状态感知和失败恢复设计。');
  }
  if (/benchmark|eval|leaderboard|dataset/.test(text)) {
    points.push('包含评测/benchmark 信号，项目价值不只在实现，也可能在可复现评估方法。');
  }
  if ((input.repo.stargazers_count ?? 0) > 1000 && /example|template|quickstart|demo/.test(text)) {
    points.push('具备传播性和上手路径，适合作为学习样板或二次开发起点。');
  }
  if (!points.length) {
    points.push('暂未识别到非常明确的技术创新标签，价值更可能来自工程整合、易用性或特定场景落地。');
  }
  return points;
}

export function formatAnalyzeMarkdown(input: {
  repo: GithubRepo;
  readme: string;
  contents: GithubContent[];
  tree: GithubTreeItem[];
  treeTruncated: boolean;
  languages: Record<string, number>;
  contributors: GithubContributor[];
  commits: GithubCommit[];
  releases: GithubRelease[];
  hnHits: HnHit[];
  sampledFiles: Record<string, string>;
}): string {
  const {
    repo,
    readme,
    contents,
    tree,
    treeTruncated,
    languages,
    contributors,
    commits,
    releases,
    hnHits,
    sampledFiles
  } = input;
  const scored = scoreRepo(repo);
  const dirs = contents.filter((item) => item.type === 'dir').map((item) => item.name);
  const files = contents.filter((item) => item.type !== 'dir').map((item) => item.name);
  const readmeLead = oneLine(
    readme.split('\n').find((line) => line.trim() && !line.trim().startsWith('#')) ?? ''
  ).slice(0, 800);
  const keyDirs = topDirs(tree);
  const keyFiles = importantFiles(tree);

  const lines = [
    `# ${repo.full_name} 项目识别`,
    '',
    `推荐等级：${scored.grade} / ${scored.score}`,
    `仓库：${repo.html_url}`,
    `描述：${oneLine(repo.description) || '无描述'}`,
    `主语言：${repo.language ?? 'unknown'} · Stars：${repo.stargazers_count} · Forks：${repo.forks_count} · Open issues：${repo.open_issues_count}`,
    `最近更新：${repo.pushed_at ?? repo.updated_at ?? ''}`,
    `协议：${repo.license?.spdx_id ?? repo.license?.name ?? '未识别'}`,
    '',
    '## 语言与规模',
    `语言占比：${percentMap(languages)}`,
    `仓库树：读取 ${tree.length} 个条目${treeTruncated ? '（GitHub 返回已截断）' : ''}`,
    `关键目录：${keyDirs.join(', ') || dirs.slice(0, 20).join(', ') || '无'}`,
    '',
    '## 活跃度与参与度',
    formatCommitCadence(commits),
    '',
    formatContributors(contributors),
    '',
    '## 项目简报',
    readmeLead || 'README 摘要信息有限，建议继续人工查看仓库文档。',
    '',
    '## 技术架构图',
    architectureDiagram(tree, languages, sampledFiles),
    '',
    '## 技术架构分析',
    ...inferArchitecture(contents, readme).map((item) => `- ${item}`),
    ...inferTechArchitecture(tree, readme, languages, sampledFiles).map((item) => `- ${item}`),
    '',
    `根目录目录：${dirs.slice(0, 30).join(', ') || '无'}`,
    `根目录文件：${files.slice(0, 30).join(', ') || '无'}`,
    '',
    '## 关键文件线索',
    keyFiles.length ? keyFiles.map((path) => `- ${path}`).join('\n') : '未识别到明显关键文件。',
    '',
    '## 代码价值判断',
    ...codeValueJudgement({ repo, tree, languages, contributors, sampledFiles }).map(
      (item) => `- ${item}`
    ),
    '',
    '## 价值与创新点',
    ...innovationJudgement({ repo, readme, tree, sampledFiles }).map((item) => `- ${item}`),
    '',
    '## 最近更新'
  ];

  if (releases.length) {
    lines.push('Release：');
    releases.slice(0, 3).forEach((rel) => {
      lines.push(
        `- ${rel.tag_name ?? rel.name ?? 'release'} · ${rel.published_at ?? ''} · ${rel.html_url ?? ''}`
      );
    });
  } else {
    lines.push('未读取到最近 release。');
  }

  if (commits.length) {
    lines.push('', 'Commit：');
    commits.slice(0, 5).forEach((commit) => {
      lines.push(
        `- ${oneLine(commit.commit?.message).slice(0, 180)} · ${commit.commit?.author?.date ?? ''}`
      );
    });
  }

  lines.push('', '## 社区/外部评价');
  if (hnHits.length) {
    hnHits.slice(0, 5).forEach((hit, index) => {
      const title = oneLine(hit.title ?? hit.story_title) || `Hacker News 讨论 ${index + 1}`;
      const url =
        hit.url ||
        hit.story_url ||
        (hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : '');
      lines.push(
        `- ${title} · points=${hit.points ?? 0} · comments=${hit.num_comments ?? 0}${url ? ` · ${url}` : ''}`
      );
    });
  } else {
    lines.push('未在 Hacker News 中找到明显讨论；这不代表没有其他社区评价。');
  }

  lines.push('', '## 判断', `推荐理由：${scored.reasons.join('；') || '指标有限，需要继续观察'}`);
  if (scored.risks.length) lines.push(`风险：${scored.risks.join('；')}`);
  else lines.push('风险：未发现明显基础风险，但仍需结合代码质量和实际运行验证。');

  return lines.join('\n');
}

export function formatHnLinks(hits: HnHit[]): string {
  return hits
    .map((hit, index) => {
      const title = oneLine(hit.title ?? hit.story_title) || `Hacker News ${index + 1}`;
      const url =
        hit.url ||
        hit.story_url ||
        (hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : '');
      return url ? `${index + 1}. ${title} - ${url}` : '';
    })
    .filter(Boolean)
    .join('\n');
}
