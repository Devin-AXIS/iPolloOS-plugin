import { describe, expect, it } from 'vitest';
import { InputType, buildRenderRequest } from '../src';

describe('hyperframes platform', () => {
  it('builds a HyperFrames render request', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html',
      manifest_json:
        '{"mode":"html_to_video","render_profile":"hyperframes","render_size":"landscape_1080p","duration_seconds":30}',
      extra_payload: '{"oss_prefix":"renders/demo"}'
    });

    expect(buildRenderRequest(input)).toEqual({
      action: 'submit',
      job_id: undefined,
      source: {
        page_url: 'https://os.ipollo.net/demo.html',
        html: undefined
      },
      manifest: {
        mode: 'html_to_video',
        render_profile: 'hyperframes',
        render_size: 'landscape_1080p',
        duration_seconds: 30
      },
      extra: {
        oss_prefix: 'renders/demo'
      }
    });
  });

  it('accepts manifest-only render submissions', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      manifest_json:
        '{"composition_url":"https://os.ipollo.net/demo.html","render_size":"portrait_1080p"}'
    });

    expect(buildRenderRequest(input).manifest).toMatchObject({
      composition_url: 'https://os.ipollo.net/demo.html',
      render_size: 'portrait_1080p'
    });
  });

  it('requires a render project for submissions', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit'
      })
    ).toThrow();
  });

  it('allows platform default render endpoint configuration', () => {
    const input = InputType.parse({
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html'
    });

    expect(input.renderEndpointUrl).toBeUndefined();
    expect(buildRenderRequest(input).source.page_url).toBe('https://os.ipollo.net/demo.html');
  });

  it('rejects invalid manifest JSON', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit',
        manifest_json: '{bad json'
      })
    ).toThrow();
  });

  it('requires job_id for status and cancel', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'status'
      })
    ).toThrow();
  });
});
