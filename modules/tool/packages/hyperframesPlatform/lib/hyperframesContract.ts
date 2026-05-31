type ManifestLike = Record<string, unknown>;
type StoryboardLike = Record<string, unknown> | unknown[];

function hasArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function readScenes(storyboard: StoryboardLike | undefined) {
  if (Array.isArray(storyboard)) return storyboard;
  const scenes = storyboard?.scenes;
  return Array.isArray(scenes) ? scenes : [];
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function validateHyperframesContract(props: {
  compositionHtml: string;
  manifest: ManifestLike;
  storyboard?: StoryboardLike;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const html = props.compositionHtml;
  const manifest = props.manifest;
  const storyboardScenes = readScenes(props.storyboard);

  const requireHtml = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };

  requireHtml(/<!doctype html>|<html[\s>]/i.test(html), 'composition_html 必须是完整 HTML 文档。');
  requireHtml(
    !/<body[^>]*>\s*<template[\s>]/i.test(html),
    '主 composition 不能用 <template> 包住内容，否则浏览器会隐藏画面。'
  );
  requireHtml(/data-composition-id\s*=/.test(html), '缺少 data-composition-id。');
  requireHtml(/data-width\s*=/.test(html), '缺少 data-width。');
  requireHtml(/data-height\s*=/.test(html), '缺少 data-height。');
  requireHtml(/data-start\s*=/.test(html), '缺少 data-start 时间轴标记。');
  requireHtml(/data-duration\s*=/.test(html), '缺少 data-duration 时长标记。');
  requireHtml(/data-track-index\s*=/.test(html), '缺少 data-track-index 轨道标记。');
  requireHtml(/window\.__timelines/.test(html), '缺少 window.__timelines 时间轴注册。');
  requireHtml(
    /gsap\.timeline\s*\(\s*\{[^}]*paused\s*:\s*true/i.test(html),
    'GSAP timeline 必须 paused:true，由播放器控制。'
  );

  if (/repeat\s*:\s*-1/.test(html)) {
    errors.push('禁止 repeat:-1，无限循环会破坏捕获引擎。');
  }
  if (
    /Math\.random\s*\(|Date\.now\s*\(|setTimeout\s*\(|setInterval\s*\(|async\s+function|=>\s*[^=]*await/.test(
      html
    )
  ) {
    errors.push('时间轴必须同步且确定性构建，禁止 Math.random/Date.now/setTimeout/async await。');
  }
  if (/<video\b(?![^>]*muted)(?![^>]*playsinline)/i.test(html)) {
    errors.push('视频元素必须 muted playsinline；音频需单独 <audio> 轨道。');
  }
  if (/data-layer\s*=|data-end\s*=/.test(html)) {
    errors.push('禁止 data-layer/data-end；请使用 data-track-index/data-duration。');
  }

  const durationSeconds = readNumber(manifest.duration_seconds);
  if (!durationSeconds || durationSeconds <= 0) {
    errors.push('manifest_json 必须包含有效 duration_seconds。');
  }
  if (manifest.schema_version !== 'hyperframes.video.v1') {
    errors.push('manifest_json.schema_version 必须是 hyperframes.video.v1。');
  }
  if (!manifest.video_template_id) warnings.push('manifest_json 建议包含 video_template_id。');
  if (!manifest.purpose_id) warnings.push('manifest_json 建议包含 purpose_id。');
  if (!manifest.style_id) warnings.push('manifest_json 建议包含 style_id。');

  const timeline = manifest.timeline;
  const scenes = manifest.scenes;
  if (!hasArray(timeline) && !hasArray(scenes) && storyboardScenes.length === 0) {
    errors.push('manifest_json/storyboard_json 必须包含非空 timeline 或 scenes。');
  }

  if (storyboardScenes.length > 1 && !/transition|转场|crossfade|wipe|reveal|shader/i.test(html)) {
    warnings.push('多场景 composition 应明确写入转场机制，避免跳切。');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checklist: {
      complete_html: /<!doctype html>|<html[\s>]/i.test(html),
      root_composition: /data-composition-id\s*=/.test(html),
      timed_clips: /data-start\s*=/.test(html) && /data-duration\s*=/.test(html),
      track_indexes: /data-track-index\s*=/.test(html),
      registered_paused_timeline:
        /window\.__timelines/.test(html) &&
        /gsap\.timeline\s*\(\s*\{[^}]*paused\s*:\s*true/i.test(html),
      manifest_timeline: hasArray(timeline) || hasArray(scenes),
      storyboard_scenes: storyboardScenes.length
    }
  };
}
