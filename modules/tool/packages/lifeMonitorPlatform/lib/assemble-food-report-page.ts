import { buildLifeAssistantSingleFileHtml } from './scaffold';
import { parseMealAnalysisJson } from './meal-json';
import { buildDailyProgressPanel, buildMealAnalysisPanel } from './panels';

export type AssembleFoodReportIn = {
  lang: 'zh-CN' | 'en';
  page_title: string;
  heading_h1: string;
  subtitle: string;
  meal_analysis_json: string;
  main_inner_html: string;
  prepend_progress_card: boolean;
  daily_targets_json: string;
  daily_state_json: string;
};

export type AssembleFoodReportOut = {
  page_html: string;
  page_url: string;
  summary: string;
};

function wrapUserHtml(html: string): string {
  const t = html.trim();
  if (!t) return '';
  return `<div class="life-aino-card"><div class="life-inner-panel life-md">${t}</div></div>`;
}

export function assembleFoodReportPage(inp: AssembleFoodReportIn): AssembleFoodReportOut {
  const lang = inp.lang;
  const meal = parseMealAnalysisJson(inp.meal_analysis_json ?? '');
  const mealHtml = meal ? buildMealAnalysisPanel(meal, lang) : '';
  const progHtml = inp.prepend_progress_card
    ? buildDailyProgressPanel(inp.daily_targets_json ?? '', inp.daily_state_json ?? '', lang)
    : '';
  const userHtml = wrapUserHtml(inp.main_inner_html ?? '');
  const stackHtml = [mealHtml, progHtml, userHtml].filter(Boolean).join('\n');
  const full = buildLifeAssistantSingleFileHtml({
    lang,
    page_title: inp.page_title.trim(),
    heading_h1: (inp.heading_h1 ?? '').trim() || inp.page_title.trim(),
    subtitle: inp.subtitle.trim(),
    stack_html: stackHtml
  });
  return {
    page_html: full,
    page_url: '',
    summary:
      lang === 'en'
        ? 'AINO-style food report page (photo card + optional progress).'
        : '已生成 AINO 生活助手风食物分析报告（照片卡 + 可选今日进度）。'
  };
}
