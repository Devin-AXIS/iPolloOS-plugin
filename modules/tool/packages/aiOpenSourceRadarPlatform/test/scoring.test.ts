import { describe, expect, test } from 'bun:test';
import { scoreRepo } from '../lib/scoring';

describe('scoreRepo', () => {
  test('scores active AI repo higher', () => {
    const recent = new Date().toISOString();
    const scored = scoreRepo({
      full_name: 'owner/repo',
      name: 'repo',
      html_url: 'https://github.com/owner/repo',
      description: 'AI agent framework',
      stargazers_count: 5000,
      forks_count: 800,
      open_issues_count: 40,
      watchers_count: 5000,
      language: 'TypeScript',
      license: { spdx_id: 'MIT', name: 'MIT' },
      topics: ['ai', 'llm', 'agent'],
      pushed_at: recent,
      updated_at: recent,
      archived: false,
      disabled: false
    });

    expect(scored.score).toBeGreaterThanOrEqual(75);
    expect(scored.reasons.join(' ')).toContain('AI');
  });
});
