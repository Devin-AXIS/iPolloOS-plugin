import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import {
  firstNumber,
  firstText,
  parseJsonArray,
  parseJsonObject,
  stringifyJson,
  todayIso
} from '../../../lib/json';

const CardTypeSchema = z.enum([
  'today_overview',
  'meal_log',
  'water_log',
  'exercise_log',
  'morning_plan',
  'evening_summary'
]);

export const InputType = z.object({
  card_type: CardTypeSchema.default('today_overview'),
  payload_json: z.string().min(1),
  records_json: z.string().optional(),
  profile_json: z.string().optional()
});

export const OutputType = z.object({
  app_card: z.string(),
  record_json: z.string(),
  records_json: z.string(),
  view_model_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function timeLabel(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function sum(records: Array<Record<string, unknown>>, key: string): number {
  return records.reduce((total, record) => total + (firstNumber(record[key]) ?? 0), 0);
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeLifeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return asObject(record.props) ?? asObject(record.record) ?? record;
}

function roundAmount(value: number | undefined, fallback = 0): number {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

function remainingAmount(target: number | undefined, used: number | undefined): number | undefined {
  if (target == null || target <= 0 || used == null) return undefined;
  return Math.max(0, Math.round(target - used));
}

function progressPercent(
  current: number | undefined,
  target: number | undefined
): number | undefined {
  if (current == null || target == null || target <= 0) return undefined;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function metForActivity(activity: string | undefined): number {
  const text = normalizeText(activity);
  if (/跑|慢跑|jog|run|running/.test(text)) return 8.3;
  if (/快走|健走|brisk/.test(text)) return 4.3;
  if (/走|步行|walk/.test(text)) return 3.5;
  if (/骑|单车|cycling|bike/.test(text)) return 6.8;
  if (/力量|抗阻|器械|strength|weight|gym|健身/.test(text)) return 5;
  if (/瑜伽|拉伸|yoga|stretch/.test(text)) return 2.5;
  if (/游泳|swim/.test(text)) return 7;
  if (/hiit|间歇|tabata/.test(text)) return 9;
  return 4.5;
}

function intensityFactor(intensity: string | undefined): number {
  const text = normalizeText(intensity);
  if (/轻|低|慢|low|easy/.test(text)) return 0.78;
  if (/强|高|很累|max|hard|high/.test(text)) return 1.22;
  return 1;
}

function estimateExerciseKcal(params: {
  activity?: string;
  minutes?: number;
  weightKg?: number;
  intensity?: string;
}): number | undefined {
  const minutes = Number(params.minutes ?? 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  const weightKg = Number(params.weightKg ?? 65);
  const safeWeightKg = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 65;
  const kcal =
    ((metForActivity(params.activity) * intensityFactor(params.intensity) * 3.5 * safeWeightKg) /
      200) *
    minutes;
  return roundAmount(kcal);
}

function exerciseKcalFromRecord(
  record: Record<string, unknown>,
  profile?: Record<string, unknown>
): number {
  const raw = firstNumber(record.kcal, record.calories_burned, record.caloriesBurned);
  if (raw != null && raw > 0) return raw;
  return (
    estimateExerciseKcal({
      activity: firstText(record.title, record.activity),
      minutes: firstNumber(record.duration_minutes, record.minutes),
      weightKg: firstNumber(profile?.weight_kg),
      intensity: firstText(record.intensity)
    }) ?? 0
  );
}

function sumExerciseKcal(
  records: Array<Record<string, unknown>>,
  profile?: Record<string, unknown>
): number {
  return records.reduce((total, record) => total + exerciseKcalFromRecord(record, profile), 0);
}

function textFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const object = asObject(value);
  if (!object) return undefined;
  return firstText(
    object.text,
    object.title,
    object.label,
    object.summary,
    object.note,
    object.content
  );
}

function textListFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(textFromValue)
      .filter((item): item is string => Boolean(item))
      .slice(0, 8);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text) as unknown;
      const list = textListFromValue(parsed);
      if (list.length > 0) return list;
    } catch {
      // keep plain text splitting below
    }
    return text
      .split(/\n|；|;/)
      .map((item) => item.replace(/^[-*•\d.、\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  const text = textFromValue(value);
  return text ? [text] : [];
}

function pickTextList(source: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const list = textListFromValue(source[key]);
    if (list.length > 0) return list;
  }
  return [];
}

function markdownSection(title: string, lines: Array<string | undefined>): string[] {
  const cleaned = lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line));
  if (cleaned.length === 0) return [];
  return [
    '',
    `## ${title}`,
    '',
    ...cleaned.map((line) => (line.startsWith('- ') ? line : `- ${line}`))
  ];
}

function buildDetailMarkdown(
  title: string,
  summary: string | undefined,
  sections: string[][]
): string {
  const lines = [`# ${title}`];
  if (summary?.trim()) lines.push('', summary.trim());
  for (const section of sections) {
    if (section.length > 0) lines.push(...section);
  }
  return lines.join('\n').trim();
}

function buildCard(componentName: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `life-${Date.now()}`,
    componentName,
    data
  };
}

function baseRecord(tableKey: string, record: Record<string, unknown>): Record<string, unknown> {
  return {
    tableKey,
    record: {
      ...record,
      created_at: firstText(record.created_at) ?? new Date().toISOString()
    }
  };
}

function attachCardToRecord(
  record: Record<string, unknown>,
  card: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...record,
    record: {
      ...(asObject(record.record) ?? {}),
      app_card_json: card
    }
  };
}

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const payload = parseJsonObject(input.payload_json, '结构化结果');
    const profile = parseJsonObject(input.profile_json, '生活档案');
    const records = parseJsonArray(input.records_json, '当日记录列表').map(normalizeLifeRecord);
    const date = firstText(payload.record_date, payload.report_date, payload.date) ?? todayIso();
    const targetKcal =
      firstNumber(profile.daily_calorie_kcal, payload.target_kcal, payload.targetKcal) ?? 0;
    const targetProtein = firstNumber(profile.protein_g, payload.target_protein_g);
    const targetFat = firstNumber(profile.fat_g, payload.target_fat_g);
    const targetCarbs = firstNumber(profile.carbs_g, payload.target_carbs_g);

    if (input.card_type === 'meal_log') {
      const kcal = firstNumber(payload.kcal, payload.calories, payload.calories_kcal) ?? 0;
      const title = firstText(payload.title, payload.food_name, payload.meal_name) ?? '饮食记录';
      const summary = firstText(payload.summary, payload.notes) ?? `已记录 ${title}。`;
      const protein = firstNumber(payload.protein_g, payload.protein) ?? 0;
      const fat = firstNumber(payload.fat_g, payload.fat) ?? 0;
      const carbs = firstNumber(payload.carbs_g, payload.carbs) ?? 0;
      const todayIntake =
        firstNumber(payload.today_intake_kcal, payload.today_kcal, payload.intake_kcal) ??
        sum(
          records.filter((r) => r.record_type === 'meal'),
          'kcal'
        ) + kcal;
      const todayProtein =
        firstNumber(payload.today_protein_g) ??
        sum(
          records.filter((r) => r.record_type === 'meal'),
          'protein_g'
        ) + protein;
      const todayFat =
        firstNumber(payload.today_fat_g) ??
        sum(
          records.filter((r) => r.record_type === 'meal'),
          'fat_g'
        ) + fat;
      const todayCarbs =
        firstNumber(payload.today_carbs_g) ??
        sum(
          records.filter((r) => r.record_type === 'meal'),
          'carbs_g'
        ) + carbs;
      const recommendations = pickTextList(payload, ['recommendations', 'suggestions', 'advice']);
      const photoUrl = firstText(payload.photo_url, payload.image_url);
      const detailMarkdown = buildDetailMarkdown('本餐记录', summary, [
        markdownSection('本次分析', [
          `食物：${title}`,
          `热量：${roundAmount(kcal)} kcal`,
          protein > 0 || fat > 0 || carbs > 0
            ? `营养：蛋白质 ${roundAmount(protein)}g，脂肪 ${roundAmount(fat)}g，碳水 ${roundAmount(carbs)}g`
            : undefined,
          photoUrl ? `图片：${photoUrl}` : undefined
        ]),
        markdownSection('今日余量', [
          targetKcal > 0
            ? `今日已摄入约 ${roundAmount(todayIntake)} / ${roundAmount(targetKcal)} kcal`
            : undefined,
          targetProtein
            ? `蛋白质剩余约 ${remainingAmount(targetProtein, todayProtein) ?? 0}g`
            : undefined,
          targetFat ? `脂肪剩余约 ${remainingAmount(targetFat, todayFat) ?? 0}g` : undefined,
          targetCarbs ? `碳水剩余约 ${remainingAmount(targetCarbs, todayCarbs) ?? 0}g` : undefined
        ]),
        markdownSection('建议', recommendations)
      ]);
      const recordPayload = {
        record_date: date,
        record_type: 'meal',
        title,
        notes: firstText(payload.notes, payload.summary),
        kcal,
        protein_g: protein,
        fat_g: fat,
        carbs_g: carbs,
        photo_url: photoUrl,
        detail_markdown: detailMarkdown,
        source: firstText(payload.source) ?? 'agent'
      };
      const record = baseRecord('life_log', recordPayload);
      const card = buildCard('AIContentCard', {
        tag: { label: 'MEAL', kind: 'meal' },
        time: timeLabel(),
        title: '本餐记录',
        intro: summary,
        recordDate: date,
        recordType: 'meal',
        detailMarkdown,
        body: {
          type: 'nutrition',
          label: 'NUTRITION',
          foodName: title,
          calories: kcal,
          protein,
          fat,
          carbs,
          remaining: {
            calories: remainingAmount(targetKcal, todayIntake),
            protein: remainingAmount(targetProtein, todayProtein),
            fat: remainingAmount(targetFat, todayFat),
            carbs: remainingAmount(targetCarbs, todayCarbs)
          }
        }
      });
      const writeRecord = attachCardToRecord(record, card);
      return {
        app_card: stringifyJson(card),
        record_json: stringifyJson(writeRecord),
        records_json: stringifyJson([writeRecord]),
        view_model_json: stringifyJson({ card_type: input.card_type, date, kcal })
      };
    }

    if (input.card_type === 'water_log') {
      const waterMl = firstNumber(payload.water_ml, payload.ml, payload.amount_ml) ?? 0;
      const title = firstText(payload.title, payload.drink_type) ?? '喝水记录';
      const drinkType = firstText(payload.drink_type) ?? '水';
      const goalMl =
        firstNumber(profile.daily_water_ml, payload.goal_ml, payload.target_water_ml) ?? 0;
      const intakeMl =
        firstNumber(payload.today_water_ml, payload.intake_ml, payload.intakeMl) ??
        sum(
          records.filter((r) => r.record_type === 'water'),
          'water_ml'
        ) + waterMl;
      const remainingMl = remainingAmount(goalMl, intakeMl) ?? 0;
      const percent = progressPercent(intakeMl, goalMl);
      const statusComment =
        firstText(payload.status_comment, payload.statusComment) ??
        (goalMl <= 0
          ? '已记录本次饮水'
          : remainingMl === 0
            ? '已达成目标'
            : percent && percent >= 70
              ? '接近目标'
              : '继续补水');
      const detailMarkdown = buildDetailMarkdown(
        '喝水记录',
        firstText(payload.summary, payload.notes) ??
          `已记录 ${roundAmount(waterMl)} ml ${drinkType}。`,
        [
          markdownSection('本次记录', [
            `饮品：${drinkType}`,
            `本次：${roundAmount(waterMl)} ml`,
            goalMl > 0
              ? `今日累计：${roundAmount(intakeMl)} / ${roundAmount(goalMl)} ml`
              : `今日累计：${roundAmount(intakeMl)} ml`,
            goalMl > 0 ? `剩余：${roundAmount(remainingMl)} ml` : undefined,
            percent != null ? `进度：${percent}%` : undefined
          ]),
          markdownSection(
            '建议',
            pickTextList(payload, ['recommendations', 'suggestions', 'advice'])
          )
        ]
      );
      const recordPayload = {
        record_date: date,
        record_type: 'water',
        title,
        notes: firstText(payload.notes),
        water_ml: waterMl,
        drink_type: drinkType,
        detail_markdown: detailMarkdown,
        source: firstText(payload.source) ?? 'agent'
      };
      const record = baseRecord('life_log', recordPayload);
      const card = buildCard('AIContentCard', {
        tag: { label: 'WATER', kind: 'water' },
        time: timeLabel(),
        title: '喝水记录',
        intro:
          firstText(payload.summary, payload.notes) ??
          `已记录 ${roundAmount(waterMl)} ml ${drinkType}。`,
        recordDate: date,
        recordType: 'water',
        detailMarkdown,
        body: {
          type: 'daily_water',
          label: 'WATER',
          loggedMl: waterMl,
          intakeMl,
          goalMl,
          drinkType,
          remainingMl,
          progressPercent: percent,
          statusComment
        }
      });
      const writeRecord = attachCardToRecord(record, card);
      return {
        app_card: stringifyJson(card),
        record_json: stringifyJson(writeRecord),
        records_json: stringifyJson([writeRecord]),
        view_model_json: stringifyJson({ card_type: input.card_type, date, water_ml: waterMl })
      };
    }

    if (input.card_type === 'exercise_log') {
      const minutes = firstNumber(payload.duration_minutes, payload.minutes) ?? 0;
      const activity = firstText(payload.title, payload.activity) ?? '运动记录';
      const intensity = firstText(payload.intensity);
      const rawBurned = firstNumber(payload.kcal, payload.calories_burned, payload.caloriesBurned);
      const estimatedBurned =
        rawBurned == null || rawBurned <= 0
          ? estimateExerciseKcal({
              activity,
              minutes,
              weightKg: firstNumber(profile.weight_kg, payload.weight_kg),
              intensity
            })
          : undefined;
      const burned = rawBurned && rawBurned > 0 ? rawBurned : estimatedBurned ?? 0;
      const estimatedKcal = rawBurned == null || rawBurned <= 0;
      const summary =
        firstText(payload.summary, payload.notes) ??
        `已记录 ${activity} ${roundAmount(minutes)} 分钟。`;
      const todayBurned =
        firstNumber(payload.today_burned_kcal, payload.todayBurned) ??
        sumExerciseKcal(
          records.filter((r) => r.record_type === 'exercise'),
          profile
        ) + burned;
      const targetMinutes = firstNumber(
        payload.target_exercise_minutes,
        profile.target_exercise_minutes
      );
      const todayMinutes =
        firstNumber(payload.today_exercise_minutes) ??
        sum(
          records.filter((r) => r.record_type === 'exercise'),
          'duration_minutes'
        ) + minutes;
      const detailMarkdown = buildDetailMarkdown('运动记录', summary, [
        markdownSection('本次记录', [
          `项目：${activity}`,
          `时长：${roundAmount(minutes)} 分钟`,
          `消耗：${estimatedKcal && burned > 0 ? '约 ' : ''}${roundAmount(burned)} kcal${estimatedKcal && burned > 0 ? '（按项目、时长和体重估算）' : ''}`,
          intensity ? `强度：${intensity}` : undefined
        ]),
        markdownSection('今日累计', [
          `运动消耗约 ${roundAmount(todayBurned)} kcal`,
          `运动时长约 ${roundAmount(todayMinutes)} 分钟`,
          targetMinutes
            ? `距离目标还差约 ${remainingAmount(targetMinutes, todayMinutes) ?? 0} 分钟`
            : undefined
        ]),
        markdownSection('建议', pickTextList(payload, ['recommendations', 'suggestions', 'advice']))
      ]);
      const recordPayload = {
        record_date: date,
        record_type: 'exercise',
        title: activity,
        notes: firstText(payload.notes),
        kcal: burned,
        estimated_kcal: estimatedKcal && burned > 0,
        duration_minutes: minutes,
        intensity,
        detail_markdown: detailMarkdown,
        source: firstText(payload.source) ?? 'agent'
      };
      const record = baseRecord('life_log', recordPayload);
      const card = buildCard('AIContentCard', {
        tag: { label: 'MOVE', kind: 'exercise' },
        time: timeLabel(),
        title: '运动记录',
        intro: summary,
        recordDate: date,
        recordType: 'exercise',
        detailMarkdown,
        body: {
          type: 'exercise',
          label: 'MOVE',
          activity,
          durationMinutes: minutes,
          caloriesBurned: burned,
          estimatedKcal: estimatedKcal && burned > 0,
          today: {
            todayBurned,
            todayRemainingMinutes: remainingAmount(targetMinutes, todayMinutes)
          }
        }
      });
      const writeRecord = attachCardToRecord(record, card);
      return {
        app_card: stringifyJson(card),
        record_json: stringifyJson(writeRecord),
        records_json: stringifyJson([writeRecord]),
        view_model_json: stringifyJson({
          card_type: input.card_type,
          date,
          burned,
          minutes,
          estimated_kcal: estimatedKcal && burned > 0
        })
      };
    }

    if (input.card_type === 'morning_plan' || input.card_type === 'evening_summary') {
      const recommendations = pickTextList(payload, [
        'recommendations',
        'suggestions',
        'items',
        'advice'
      ]);
      const reportType = input.card_type;
      const title = reportType === 'morning_plan' ? '今日建议' : '今晚报告';
      const summary = firstText(payload.summary, payload.title) ?? title;
      const mealKcal = sum(
        records.filter((r) => r.record_type === 'meal'),
        'kcal'
      );
      const waterMl = sum(
        records.filter((r) => r.record_type === 'water'),
        'water_ml'
      );
      const exerciseRecords = records.filter((r) => r.record_type === 'exercise');
      const burned = sumExerciseKcal(exerciseRecords, profile);
      const exerciseMinutes = sum(exerciseRecords, 'duration_minutes');
      const detailMarkdown = buildDetailMarkdown(title, summary, [
        markdownSection('今日数据', [
          targetKcal > 0
            ? `热量：已摄入约 ${roundAmount(mealKcal)} / ${roundAmount(targetKcal)} kcal`
            : mealKcal > 0
              ? `热量：已摄入约 ${roundAmount(mealKcal)} kcal`
              : undefined,
          firstNumber(profile.daily_water_ml)
            ? `饮水：${roundAmount(waterMl)} / ${roundAmount(firstNumber(profile.daily_water_ml))} ml`
            : waterMl > 0
              ? `饮水：${roundAmount(waterMl)} ml`
              : undefined,
          burned > 0
            ? `运动消耗：${roundAmount(burned)} kcal`
            : exerciseMinutes > 0
              ? `运动时长：${roundAmount(exerciseMinutes)} 分钟`
              : undefined
        ]),
        markdownSection(
          reportType === 'morning_plan' ? '今天怎么做' : '总结与明天建议',
          recommendations
        )
      ]);
      const card = buildCard('AIContentCard', {
        tag: { label: reportType === 'morning_plan' ? 'PLAN' : 'REPORT', kind: 'summary' },
        time: timeLabel(),
        title,
        intro: summary,
        recordDate: date,
        reportDate: date,
        recordType: reportType,
        detailMarkdown,
        body: {
          type: 'daily_brief',
          templateLabel: reportType === 'morning_plan' ? '早间建议' : '晚间报告',
          issueDate: date,
          summary,
          items: (recommendations.length > 0 ? recommendations : [summary])
            .slice(0, 5)
            .map((item) => ({ text: String(item), type: 'other' }))
        }
      });
      const record = baseRecord('life_daily_report', {
        report_date: date,
        report_type: reportType,
        summary,
        recommendations_json: recommendations,
        detail_markdown: detailMarkdown,
        app_card_json: card
      });
      return {
        app_card: stringifyJson(card),
        record_json: stringifyJson(record),
        records_json: stringifyJson([record]),
        view_model_json: stringifyJson({ card_type: input.card_type, date, summary })
      };
    }

    const intake =
      firstNumber(payload.intake_kcal, payload.intakeKcal) ??
      sum(
        records.filter((r) => r.record_type === 'meal'),
        'kcal'
      );
    const burned =
      firstNumber(payload.burned_kcal, payload.burnedKcal) ??
      sumExerciseKcal(
        records.filter((r) => r.record_type === 'exercise'),
        profile
      );
    const waterMl =
      firstNumber(payload.water_ml, payload.waterMl) ??
      sum(
        records.filter((r) => r.record_type === 'water'),
        'water_ml'
      );
    const net = firstNumber(payload.net_kcal, payload.netKcal) ?? intake - burned;
    const summary = firstText(payload.summary) ?? '今日记录概览。';
    const waterGoal = firstNumber(profile.daily_water_ml);
    const detailMarkdown = buildDetailMarkdown('今日概览', summary, [
      markdownSection('今日完成情况', [
        `饮食摄入：${roundAmount(intake)} kcal`,
        `运动消耗：${roundAmount(burned)} kcal`,
        `净热量：${roundAmount(net)} kcal`,
        targetKcal > 0 ? `还可摄入：${remainingAmount(targetKcal, net) ?? 0} kcal` : undefined,
        waterGoal
          ? `饮水：${roundAmount(waterMl)} / ${roundAmount(waterGoal)} ml`
          : `饮水：${roundAmount(waterMl)} ml`
      ]),
      markdownSection('建议', pickTextList(payload, ['recommendations', 'suggestions', 'advice']))
    ]);
    const card = buildCard('AIContentCard', {
      tag: { label: 'TODAY', kind: 'summary' },
      time: timeLabel(),
      title: '今日概览',
      intro: summary,
      recordDate: date,
      recordType: 'today_overview',
      detailMarkdown,
      body: {
        type: 'daily_calorie',
        label: 'TODAY',
        intake,
        burned,
        net,
        targetKcal: targetKcal > 0 ? targetKcal : undefined,
        remainingEat: targetKcal > 0 ? Math.max(0, targetKcal - net) : undefined,
        healthIndex: firstText(payload.health_index, payload.healthIndex),
        healthComment: firstText(payload.health_comment, payload.healthComment),
        waterMl,
        waterGoalMl: waterGoal
      }
    });

    return {
      app_card: stringifyJson(card),
      record_json: '',
      records_json: '[]',
      view_model_json: stringifyJson({
        card_type: input.card_type,
        date,
        intake,
        burned,
        net,
        water_ml: waterMl
      })
    };
  } catch (error: unknown) {
    return {
      app_card: '',
      record_json: '',
      records_json: '[]',
      view_model_json: '',
      system_error: getErrText(error)
    };
  }
}
