import { describe, expect, it } from 'vitest';
import { tool as prepareTables } from '../children/prepare_life_assistant_tables/src';
import { tool as createLifeCard } from '../children/create_life_assistant_card/src';

describe('lifeAssistantNativePlatform', () => {
  it('creates the Life Assistant dynamic-table plan', async () => {
    const result = await prepareTables({ module_name: '生活助手数据' });
    const plan = JSON.parse(result.table_plan_json);
    const tableKeys = JSON.parse(result.table_keys_json);

    expect(tableKeys).toEqual({
      profile: 'life_profile',
      log: 'life_log',
      dailyReport: 'life_daily_report'
    });
    expect(plan.tables.map((table: any) => table.key)).toEqual([
      'life_profile',
      'life_log',
      'life_daily_report'
    ]);
    expect(plan.tables.every((table: any) => table.ownership === 'per_app_user')).toBe(true);
    expect(plan.tables[0].fields.map((field: any) => field.key)).toEqual(
      expect.arrayContaining([
        'app_user_id',
        'app_user_name',
        'application_id',
        'agent_id',
        'age',
        'height_cm',
        'weight_kg',
        'goal_type',
        'daily_calorie_kcal',
        'daily_water_ml',
        'protein_g',
        'fat_g',
        'carbs_g'
      ])
    );
  });

  it('creates meal, water, and exercise cards with write records', async () => {
    const profile = JSON.stringify({
      daily_calorie_kcal: 1800,
      daily_water_ml: 2200
    });
    const meal = await createLifeCard({
      card_type: 'meal_log',
      profile_json: profile,
      payload_json: JSON.stringify({
        record_date: '2026-06-21',
        title: '鸡胸肉沙拉',
        kcal: 420,
        protein_g: 38,
        fat_g: 12,
        carbs_g: 30,
        summary: '高蛋白低油。'
      })
    });
    const water = await createLifeCard({
      card_type: 'water_log',
      profile_json: profile,
      payload_json: JSON.stringify({
        record_date: '2026-06-21',
        water_ml: 300,
        drink_type: '水'
      })
    });
    const exercise = await createLifeCard({
      card_type: 'exercise_log',
      payload_json: JSON.stringify({
        record_date: '2026-06-21',
        activity: '慢跑',
        duration_minutes: 35,
        kcal: 260
      })
    });

    const mealCard = JSON.parse(meal.app_card);
    const mealRecord = JSON.parse(meal.record_json);
    const waterCard = JSON.parse(water.app_card);
    const exerciseCard = JSON.parse(exercise.app_card);

    expect(mealCard.componentName).toBe('AIContentCard');
    expect(mealCard.data.body.type).toBe('nutrition');
    expect(mealCard.data.detailMarkdown).toContain('本餐记录');
    expect(mealCard.data.body.remaining.calories).toBe(1380);
    expect(mealRecord.tableKey).toBe('life_log');
    expect(mealRecord.record.record_type).toBe('meal');
    expect(mealRecord.record.app_card_json.componentName).toBe('AIContentCard');
    expect(waterCard.data.body.type).toBe('daily_water');
    expect(waterCard.data.body.goalMl).toBe(2200);
    expect(waterCard.data.body.remainingMl).toBe(1900);
    expect(waterCard.data.detailMarkdown).toContain('喝水记录');
    expect(JSON.parse(water.record_json).record.water_ml).toBe(300);
    expect(exerciseCard.data.body.type).toBe('exercise');
    expect(exerciseCard.data.detailMarkdown).toContain('运动记录');
    expect(JSON.parse(exercise.record_json).record.duration_minutes).toBe(35);
  });

  it('estimates exercise calories when the agent only provides activity and duration', async () => {
    const exercise = await createLifeCard({
      card_type: 'exercise_log',
      profile_json: JSON.stringify({ weight_kg: 70 }),
      payload_json: JSON.stringify({
        record_date: '2026-06-21',
        activity: '跑步',
        duration_minutes: 30
      })
    });

    const card = JSON.parse(exercise.app_card);
    const record = JSON.parse(exercise.record_json);
    const viewModel = JSON.parse(exercise.view_model_json);

    expect(card.data.body.type).toBe('exercise');
    expect(card.data.body.caloriesBurned).toBeGreaterThan(0);
    expect(card.data.body.estimatedKcal).toBe(true);
    expect(record.record.kcal).toBe(card.data.body.caloriesBurned);
    expect(record.record.estimated_kcal).toBe(true);
    expect(viewModel.estimated_kcal).toBe(true);
  });

  it('creates overview and daily report cards from partial data', async () => {
    const overview = await createLifeCard({
      card_type: 'today_overview',
      profile_json: JSON.stringify({ daily_calorie_kcal: 1800 }),
      records_json: JSON.stringify([
        { record_type: 'meal', kcal: 520 },
        { record_type: 'exercise', kcal: 180 },
        { record_type: 'water', water_ml: 500 }
      ]),
      payload_json: JSON.stringify({ summary: '今天继续保持。' })
    });
    const morning = await createLifeCard({
      card_type: 'morning_plan',
      payload_json: JSON.stringify({
        report_date: '2026-06-21',
        summary: '今天控制热量，补足饮水。',
        recommendations: ['早餐优先蛋白质', '午后步行 20 分钟']
      })
    });
    const evening = await createLifeCard({
      card_type: 'evening_summary',
      payload_json: JSON.stringify({
        report_date: '2026-06-21',
        summary: '今天完成度良好。',
        recommendations: ['明天继续记录早餐']
      })
    });

    expect(JSON.parse(overview.app_card).data.body.type).toBe('daily_calorie');
    expect(JSON.parse(overview.app_card).data.detailMarkdown).toContain('今日概览');
    expect(JSON.parse(overview.view_model_json).net).toBe(340);
    expect(JSON.parse(morning.record_json).tableKey).toBe('life_daily_report');
    expect(JSON.parse(morning.record_json).record.report_type).toBe('morning_plan');
    expect(JSON.parse(morning.app_card).data.detailMarkdown).toContain('今日建议');
    expect(JSON.parse(evening.app_card).data.title).toBe('今晚报告');
    expect(JSON.parse(evening.app_card).data.detailMarkdown).toContain('今晚报告');
  });

  it('returns system_error for malformed JSON instead of throwing', async () => {
    const result = await createLifeCard({
      card_type: 'meal_log',
      payload_json: '{bad json'
    });

    expect(result.app_card).toBe('');
    expect(result.record_json).toBe('');
    expect(result.system_error).toContain('结构化结果');
  });
});
