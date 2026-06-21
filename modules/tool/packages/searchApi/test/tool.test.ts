import { afterEach, describe, expect, test } from 'vitest';
import parentConfig from '../config';
import { tool as googleLocalPlace } from '../children/googleLocalPlace/src';
import { tool as googleRankTracking } from '../children/googleRankTracking/src';
import { tool as googleVideosSearch } from '../children/googleVideosSearch/src';

const originalFetch = globalThis.fetch;
type FetchInput = Parameters<typeof fetch>[0];

const base = {
  apiKey: 'searchapi-test-key',
  defaultCountry: 'us',
  defaultLanguage: 'en',
  baseUrl: 'https://www.searchapi.io'
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('SearchAPI platform tools', () => {
  test('keeps the existing parent plugin secret key', () => {
    expect(parentConfig.secretInputConfig?.map((item) => item.key)).toEqual(['apiKey']);
  });

  test('calls Google Shorts through the existing video child tool', async () => {
    let requestedUrl = '';
    globalThis.fetch = (async (url: FetchInput) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          shorts: [
            {
              title: 'AI demo short',
              link: 'https://www.youtube.com/shorts/1',
              source: 'YouTube'
            }
          ]
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await googleVideosSearch({
      ...base,
      q: 'AI demo',
      mode: 'shorts',
      num: 5
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get('api_key')).toBe(base.apiKey);
    expect(url.searchParams.get('engine')).toBe('google_shorts');
    expect(url.searchParams.get('q')).toBe('AI demo');
    expect(result.engine).toBe('google_shorts');
    expect(result.count).toBe(1);
  });

  test('tracks Google rank by filtering the target domain', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          organic_results: [
            { title: 'Other', link: 'https://other.example/a' },
            { title: 'OpenAI', link: 'https://openai.com/research' }
          ]
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const result = await googleRankTracking({
      ...base,
      q: 'frontier model research',
      domain: 'openai.com',
      num: 10
    });

    expect(result.count).toBe(1);
    expect(result.result[0]?.rank).toBe(2);
  });

  test('uses data_id for Google Place detail lookup', async () => {
    let requestedUrl = '';
    globalThis.fetch = (async (url: FetchInput) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          place_results: [{ title: 'Coffee Shop', address: '1 Main St', phone: '+1 555 0100' }]
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const result = await googleLocalPlace({
      ...base,
      q: '0x89c259af336b3341:0xa4969e07ce3108de',
      mode: 'place',
      num: 3
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get('engine')).toBe('google_place');
    expect(url.searchParams.get('data_id')).toBe('0x89c259af336b3341:0xa4969e07ce3108de');
    expect(url.searchParams.get('q')).toBeNull();
    expect(result.count).toBe(1);
  });
});
