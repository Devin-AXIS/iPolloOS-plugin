import { parseMealAnalysisJson } from './meal-json';

type PageCoverField = {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
};

function rounded(value: number | undefined): string {
  return Number.isFinite(value) ? String(Math.round(value as number)) : '';
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

function compactFields(fields: PageCoverField[]): PageCoverField[] {
  return fields.filter((field) => Boolean(field.value?.trim() || field.placeholder?.trim()));
}

export function buildFoodReportPageCover(params: {
  lang: 'zh-CN' | 'en';
  title: string;
  summary: string;
  meal_analysis_json?: string;
  accentColor?: string;
}): string {
  const meal = parseMealAnalysisJson(params.meal_analysis_json ?? '');
  const isEn = params.lang === 'en';
  const title = params.title.trim() || (isEn ? 'Health report' : '健康报告');
  const summary = params.summary.trim();
  const kcal = rounded(meal?.kcal);
  const protein = rounded(meal?.protein_g);
  const carbs = rounded(meal?.carbs_g);
  const fat = rounded(meal?.fat_g);
  const coverImageUrl = httpUrl(meal?.image_url);

  const fields = compactFields([
    {
      label: isEn ? 'Food' : '食物',
      value: meal?.food_name?.trim() || meal?.card_title?.trim()
    },
    {
      label: isEn ? 'Calories' : '热量',
      value: kcal ? `${kcal} kcal` : undefined
    },
    {
      label: isEn ? 'Protein' : '蛋白质',
      value: protein ? `${protein} g` : undefined
    },
    {
      label: isEn ? 'Carbs' : '碳水',
      value: carbs ? `${carbs} g` : undefined
    },
    {
      label: isEn ? 'Fat' : '脂肪',
      value: fat ? `${fat} g` : undefined
    },
    {
      label: isEn ? 'Advice' : '判断',
      value: meal?.can_eat?.trim()
    }
  ]);

  return JSON.stringify({
    title,
    description:
      meal?.verdict_reason?.trim() ||
      meal?.reason?.trim() ||
      summary ||
      (isEn ? 'AINO-style health report.' : 'AINO 生活助手风健康报告。'),
    eyebrow: isEn ? 'Health report' : '健康报告',
    variant: fields.length > 0 ? 'data' : 'summary',
    actionLabel: isEn ? 'View' : '查看',
    accentColor: params.accentColor ?? '#10b981',
    coverImageUrl,
    chips: isEn ? ['Life Assistant', 'Nutrition'] : ['生活助手', '营养分析'],
    fields
  });
}
