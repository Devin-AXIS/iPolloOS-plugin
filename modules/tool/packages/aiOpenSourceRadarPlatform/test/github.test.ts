import { describe, expect, test } from 'vitest';
import { buildAiSearchQuery, parseRepoSlug } from '../lib/github';

describe('github helpers', () => {
  test('parses repo slug', () => {
    expect(parseRepoSlug('https://github.com/microsoft/autogen')).toBe('microsoft/autogen');
    expect(parseRepoSlug('microsoft/autogen')).toBe('microsoft/autogen');
  });

  test('builds AI search query', () => {
    const q = buildAiSearchQuery({
      query: 'browser automation',
      direction: 'agent',
      language: 'TypeScript',
      minStars: 20,
      timeRange: '15d',
      discoveryMode: 'recent_new'
    });

    expect(q).toContain('browser automation');
    expect(q).toContain('agent');
    expect(q).toContain('language:TypeScript');
    expect(q).toContain('stars:>=20');
    expect(q).toContain('created:>=');
    expect(q).toContain('pushed:>=');
  });
});
