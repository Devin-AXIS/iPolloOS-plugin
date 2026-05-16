import { escapeHtml, sanitizeHttpUrl } from './escape';
import type { MealAnalysisInput } from './meal-json';

/** 与 AINO `ai-content-card` 饮食卡 / strategy 子卡 / 今日热量区视觉对齐（静态 HTML） */

const IC_FLAME = `<svg class="life-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.5-.5-4-3-6 1 2.5 1 4.5-.5 6.5-1.5 2-2.5 2.5-2.5 4a4 4 0 1 0 8 0c0-1.2-.4-2.2-1-3" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC_UTENSIL = `<svg class="life-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2v-6c0-1.1.9-2 2-2h0c1.1 0 2 .9 2 2v6c0 1.1.9 2 2 2h0c1.1 0 2-.9 2-2v-6c0-2.2-1.8-4-4-4z" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC_CHART = `<svg class="life-ic" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3v18h18M7 16l4-4 4 4 5-6" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC_HEART = `<svg class="life-ic" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 14c1.5-1.3 2.5-3.2 2.5-5.3 0-3.7-3-6.7-6.7-6.7-2 0-3.7.9-4.9 2.3C8.7 4.9 7 4 5 4 1.3 4-1.5 6.7-1.5 10.5c0 2.1 1 4 2.5 5.3l7.9 7.2 7.9-7.2z" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IC_COOKIE = `<svg class="life-ic" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r=".5" fill="#7c3aed"/><circle cx="15.5" cy="9.5" r=".5" fill="#7c3aed"/><circle cx="10.5" cy="15.5" r=".5" fill="#7c3aed"/></svg>`;
const IC_SPARKLES = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" stroke="#059669" stroke-width="2" stroke-linejoin="round"/></svg>`;

function verdictPill(
  canEat: string | undefined,
  lang: 'zh-CN' | 'en'
): { cls: string; label: string } {
  const raw = (canEat ?? '').trim();
  const v = raw.toLowerCase();
  if (
    v === 'no' ||
    v === 'avoid' ||
    raw.includes('不建议') ||
    raw.includes('不宜') ||
    raw.includes('避免') ||
    raw.includes('不能吃')
  ) {
    return {
      cls: 'life-pill life-pill--bad',
      label: lang === 'en' ? 'Avoid' : '不建议'
    };
  }
  if (
    v === 'caution' ||
    v === 'maybe' ||
    v === 'limited' ||
    raw.includes('适量') ||
    raw.includes('注意')
  ) {
    return {
      cls: 'life-pill life-pill--warn',
      label: lang === 'en' ? 'Caution' : '适量 / 注意'
    };
  }
  if (v === 'yes' || v === 'ok' || v === 'good' || raw.includes('可以') || raw.includes('能吃')) {
    return {
      cls: 'life-pill life-pill--ok',
      label: lang === 'en' ? 'OK to eat' : '可以吃'
    };
  }
  return {
    cls: 'life-pill life-pill--muted',
    label: lang === 'en' ? 'Review' : '需结合目标判断'
  };
}

function buildRemainingLine(meal: MealAnalysisInput, lang: 'zh-CN' | 'en'): string {
  const r = meal.remaining;
  if (!r) return '';
  const has = r.calories != null || r.protein != null || r.fat != null || r.carbs != null;
  if (!has) return '';
  const parts: string[] = [];
  if (r.calories != null) {
    parts.push(
      lang === 'en'
        ? `You could still have about <strong>${Math.round(r.calories)}</strong> kcal today`
        : `今日还可摄入 <strong>${Math.round(r.calories)}</strong> kcal`
    );
  }
  const sub: string[] = [];
  if (r.protein != null) sub.push(lang === 'en' ? `protein ${r.protein}g` : `蛋白质 ${r.protein}g`);
  if (r.fat != null) sub.push(lang === 'en' ? `fat ${r.fat}g` : `脂肪 ${r.fat}g`);
  if (r.carbs != null) sub.push(lang === 'en' ? `carbs ${r.carbs}g` : `碳水 ${r.carbs}g`);
  if (sub.length) {
    parts.push(
      (r.calories != null ? (lang === 'en' ? ' · ' : ' · ') : '') +
        sub.join(lang === 'en' ? ', ' : ' ')
    );
  }
  return `<p class="life-remaining-line">${parts.join('')}</p>`;
}

function buildInsightReport(meal: MealAnalysisInput, lang: 'zh-CN' | 'en'): string {
  const pts = (meal.analysis_points ?? []).map((s) => s.trim()).filter(Boolean);
  const tip = (meal.closing_tip ?? '').trim();
  if (pts.length === 0 && !tip) return '';
  const kicker = lang === 'en' ? 'INSIGHT' : '解读';
  const title = lang === 'en' ? 'Nutrition notes' : '营养解读';
  const ul =
    pts.length > 0 ? `<ul>${pts.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : '';
  const tipBlock = tip ? `<p class="life-strategy-tip">${escapeHtml(tip)}</p>` : '';
  return `<div class="life-strategy">
  <div class="life-strategy-row">
    <span class="life-strategy-ic">${IC_SPARKLES}</span>
    <div class="life-strategy-body">
      <span class="life-kicker">${escapeHtml(kicker)}</span>
      <p class="life-strategy-t">${escapeHtml(title)}</p>
      ${ul}
      ${tipBlock}
    </div>
  </div>
</div>`;
}

export function buildMealAnalysisPanel(meal: MealAnalysisInput, lang: 'zh-CN' | 'en'): string {
  const kcal = Number(meal.kcal);
  if (!Number.isFinite(kcal) || kcal < 0) return '';

  const p = Number(meal.protein_g) || 0;
  const f = Number(meal.fat_g) || 0;
  const c = Number(meal.carbs_g) || 0;
  const totalMacro = p + f + c;
  const pct =
    totalMacro > 0
      ? {
          carbs: Math.round((c / totalMacro) * 100),
          protein: Math.round((p / totalMacro) * 100),
          fat: Math.round((f / totalMacro) * 100)
        }
      : { carbs: 34, protein: 33, fat: 33 };

  const foodName = (meal.food_name ?? '').trim() || (lang === 'en' ? 'Meal' : '本餐');
  const title = (meal.card_title ?? '').trim() || (lang === 'en' ? 'Food analysis' : '食物分析');
  const reason = (meal.verdict_reason ?? meal.reason ?? '').trim();
  const pill = verdictPill(meal.can_eat, lang);
  const imgUrl = sanitizeHttpUrl(meal.image_url ?? '');

  const kicker = 'NUTRITION';
  const chipMeal = lang === 'en' ? 'MEAL' : '饮食';
  const chipNut = 'NUTRITION';

  const macroRow =
    totalMacro > 0
      ? `
    <div class="life-macro-bar" role="presentation">
      ${c > 0 ? `<span class="life-macro-seg life-macro-c" style="flex:${pct.carbs}"></span>` : ''}
      ${p > 0 ? `<span class="life-macro-seg life-macro-p" style="flex:${pct.protein}"></span>` : ''}
      ${f > 0 ? `<span class="life-macro-seg life-macro-f" style="flex:${pct.fat}"></span>` : ''}
    </div>
    <div class="life-macro-legend">
      ${c > 0 ? `<span class="life-ml-c">${lang === 'en' ? 'Carbs' : '碳水'} ${c}g ${pct.carbs}%</span>` : ''}
      ${p > 0 ? `<span class="life-ml-p">${lang === 'en' ? 'Protein' : '蛋白质'} ${p}g ${pct.protein}%</span>` : ''}
      ${f > 0 ? `<span class="life-ml-f">${lang === 'en' ? 'Fat' : '脂肪'} ${f}g ${pct.fat}%</span>` : ''}
    </div>`
      : '';

  const imgBlock = imgUrl
    ? `<div class="life-img-frame"><img src="${escapeHtml(imgUrl)}" alt="" loading="lazy"/></div>`
    : '';

  const remainingHtml = buildRemainingLine(meal, lang);

  const verdictBlock =
    reason || meal.can_eat
      ? `<div class="life-verdict">
          <span class="${pill.cls}">${escapeHtml(pill.label)}</span>
          ${reason ? `<p class="life-verdict-reason">${escapeHtml(reason)}</p>` : ''}
        </div>`
      : '';

  const insightHtml = buildInsightReport(meal, lang);

  return `<div class="life-aino-card">
  <div class="life-tag-row">
    <span class="life-aigc">${lang === 'en' ? 'AI-generated' : 'AI 生成'}</span>
    <span class="life-dot life-dot--meal" aria-hidden="true"></span>
    <span class="life-chip life-chip--meal"><span class="life-chip-ic" aria-hidden="true">🔥</span>${escapeHtml(chipMeal)}</span>
    <span class="life-chip life-chip--nut">${escapeHtml(chipNut)}</span>
  </div>
  <h3 class="life-h3">${escapeHtml(title)}</h3>
  <p class="life-intro-muted">${lang === 'en' ? 'Estimated from your photo / text; not medical advice.' : '根据您上传的照片与说明估算，非医疗诊断。'}</p>
  ${remainingHtml}
  ${imgBlock}
  <div class="life-inner-panel">
    <span class="life-kicker">${escapeHtml(kicker)}</span>
    <p class="life-food-line">${IC_UTENSIL}<span class="life-food-name">${escapeHtml(foodName)}</span></p>
    <div class="life-kcal-row">${IC_FLAME}<span class="life-kcal-num">${Math.round(kcal)}</span><span class="life-kcal-unit">kcal</span></div>
    ${macroRow}
  </div>
  ${verdictBlock}
  ${insightHtml}
</div>`;
}

export function buildDailyProgressPanel(
  targetsJson: string,
  stateJson: string,
  lang: 'zh-CN' | 'en'
): string {
  if (!targetsJson.trim() || !stateJson.trim()) return '';
  let t: { target_kcal?: number };
  let s: { totals?: { kcal?: number } };
  try {
    t = JSON.parse(targetsJson) as typeof t;
    s = JSON.parse(stateJson) as typeof s;
  } catch {
    return '';
  }
  const tk = Number(t.target_kcal);
  if (!Number.isFinite(tk) || tk <= 0) return '';
  const ck = Number(s.totals?.kcal) || 0;
  const rem = Math.round(tk - ck);
  const net = ck;
  const pct = Math.min(100, Math.round((ck / tk) * 100));

  let idx: string;
  if (lang === 'en') {
    idx = rem >= tk * 0.15 ? 'Good' : rem > 0 ? 'Watch intake' : 'Over budget';
  } else {
    idx = rem >= tk * 0.15 ? '良好' : rem > 0 ? '注意热量' : '热量已超标';
  }

  const L = {
    zh: {
      chip: 'SUMMARY',
      title: '今日热量与进度',
      intake: '饮食摄入',
      net: '今日累计摄入',
      rem: '还可吃（估算）',
      hint: '健康指数（参考）',
      kcal: 'kcal'
    },
    en: {
      chip: 'SUMMARY',
      title: 'Calories & progress',
      intake: 'Intake so far',
      net: 'Total intake',
      rem: 'Remaining (est.)',
      hint: 'Health hint',
      kcal: 'kcal'
    }
  };
  const l = lang === 'en' ? L.en : L.zh;

  return `<div class="life-aino-card life-aino-card--tight">
  <div class="life-tag-row">
    <span class="life-dot life-dot--sum" aria-hidden="true"></span>
    <span class="life-chip life-chip--sum">${IC_CHART} ${escapeHtml(l.chip)}</span>
  </div>
  <h3 class="life-h3">${escapeHtml(l.title)}</h3>
  <div class="life-inner-panel life-daily-grid">
    <div class="life-dg-row"><span class="life-dg-l">${IC_UTENSIL} ${escapeHtml(l.intake)}</span><span class="life-dg-r">${Math.round(ck)} ${l.kcal}</span></div>
    <div class="life-dg-row life-dg-sep"><span class="life-dg-l">${IC_CHART} ${escapeHtml(l.net)}</span><span class="life-dg-r life-dg-em">${net >= 0 ? '+' : ''}${Math.round(net)} ${l.kcal}</span></div>
    <div class="life-dg-row"><span class="life-dg-l">${IC_COOKIE} ${escapeHtml(l.rem)}</span><span class="life-dg-r life-dg-vi">${rem} ${l.kcal}</span></div>
    <div class="life-dg-prog">
      <div class="life-dg-prog-label"><span>${escapeHtml(l.hint)}</span><span class="life-pill life-pill--ok life-pill--sm">${escapeHtml(idx)}</span></div>
      <div class="life-bar-track"><div class="life-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <p class="life-foot-hint">${IC_HEART} ${lang === 'en' ? 'For wellness reference only.' : '仅供参考，有疾病请遵医嘱。'}</p>
  </div>
</div>`;
}
