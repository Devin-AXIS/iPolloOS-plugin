import { describe, expect, it } from 'vitest';
import { normalizeFutureInsightReport } from '../lib/report';

describe('future_insight_system_report_html', () => {
  it('exposes shared workgroup base components for the whole plugin package', async () => {
    const { buildWorkgroupSignalTags } = await import('../lib/workgroup-intelligence');
    const {
      renderWorkgroupBaseCss,
      renderWorkgroupCard,
      renderWorkgroupKpiStrip,
      renderWorkgroupEcosystemMap
    } = await import('../lib/workgroup-components');

    const css = renderWorkgroupBaseCss();
    const card = renderWorkgroupCard({
      title: 'Ecosystem Map',
      subtitle: '上下游生态',
      body: renderWorkgroupEcosystemMap([
        { title: 'Upstream', items: [{ label: '算力供应', tone: 'fog' }] },
        { title: 'Target', core: true, items: [{ label: '目标公司' }] },
        { title: 'Downstream', items: [{ label: '渠道伙伴', tone: 'coral' }] }
      ]),
      note: '判断：上下游依赖需要在背景情报系统里复用。'
    });
    const kpis = renderWorkgroupKpiStrip([{ label: 'sources', value: 18, tone: 'fog' }]);

    expect(css).toContain('--wg-paper: #f6f4f1');
    expect(card).toContain('wg-card');
    expect(card).toContain('Ecosystem Map');
    expect(card).toContain('算力供应');
    expect(card).toContain('渠道伙伴');
    expect(kpis).toContain('wg-kpi-strip');
    expect(
      buildWorkgroupSignalTags({
        rawTags: ['人物背景', '公司关联'],
        entities: [{ name: 'Nano Labs Ltd' }, { name: '香港数码港' }],
        facts: [{ title: '香港数码港相关任命应按个人节点处理' }],
        max: 4
      })
    ).toEqual(['Nano Labs', '香港数码港', '数码港董事任命']);
  });

  it('generates a stable report from minimal input', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: 'AI Agent 操作系统',
      report_json: JSON.stringify({
        input: {
          preparedFor: 'iPolloOS'
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('<!DOCTYPE html>');
    expect(result.page_html).toContain('未来洞察系统');
    expect(result.page_html).toContain('新闻墙');
    expect(result.page_html).toContain('关键信号');
    expect(result.page_html).toContain('趋势雷达');
    expect(result.page_html).toContain('7 天行动清单');
    expect(result.page_cover).toContain('未来洞察系统');
  });

  it('renders structured report_json and news sources without free-form page generation', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '具身智能',
      competitors: 'Figure, Tesla Optimus',
      report_json: JSON.stringify({
        input: {
          preparedFor: 'iPollo'
        },
        cover: {
          headline: 'Humanoid Robots Move Into Real Pilots',
          deck: '融资、招聘和工厂试点开始形成连续信号。'
        },
        verdict: {
          title: '今日结论',
          body: '具身智能正在从演示阶段进入供应链和场景验证阶段。'
        },
        newsWall: {
          columns: [
            {
              title: '核心新闻',
              items: [
                {
                  title: '某机器人公司扩大试点',
                  summary: '试点从实验室走向真实工厂线，验证周期变短。',
                  impact: '高',
                  source: 'Industry Daily',
                  url: 'https://example.com/robotics'
                }
              ]
            }
          ]
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('Humanoid Robots Move Into Real Pilots');
    expect(result.page_html).toContain('某机器人公司扩大试点');
    expect(result.page_html).toContain('https://example.com/robotics');
    expect(result.page_html).not.toMatch(/Apoll[o]/);
  });

  it('extracts concrete signal chips for future insight page cover', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: 'AI Agent / 大模型基础设施',
      competitors: 'OpenAI, Anthropic, Google Gemini, NVIDIA, DeepSeek',
      regions: '全球、中国',
      report_json: JSON.stringify({
        cover: {
          tags: ['未来洞察', '关键信号', '核心指标']
        },
        newsWall: [
          {
            title: 'DeepSeek 发布企业模型能力更新',
            summary: '企业部署和推理成本成为新的竞争焦点。',
            source: 'Example News'
          }
        ],
        signals: [
          {
            title: 'OpenAI 与 Anthropic 继续争夺企业 Agent 入口',
            summary: '平台入口和工作流稳定性是短期重点。'
          }
        ],
        radar: [{ label: 'NVIDIA 推理基础设施', phase: 'Now' }]
      }),
      page_output_mode: 'raw_html'
    });
    const cover = JSON.parse(result.page_cover);

    expect(result.system_error).toBeUndefined();
    expect(cover.chips).toContain('OpenAI');
    expect(cover.chips).toContain('Anthropic');
    expect(cover.chips.join(' ')).not.toContain('关键信号');
    expect(
      normalizeFutureInsightReport({
        industry: 'AI Agent',
        report_json: JSON.stringify({
          cover: { tags: ['未来洞察'] },
          newsWall: [{ title: 'DeepSeek 企业模型更新' }]
        })
      }).keySignals
    ).toContain('DeepSeek');
  });

  it('keeps the layout fluid instead of locking card heights or page scroll', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const longTitle =
      '这是一个非常长的新闻标题，用来验证每天输入内容长短不同的时候不会因为固定高度导致模板错位或文字溢出'.repeat(
        3
      );
    const result = await tool({
      industry: '全球 AI 基础设施',
      report_json: JSON.stringify({
        newsWall: {
          columns: [
            {
              title: '核心新闻',
              items: [
                {
                  title: longTitle,
                  summary: '长摘要内容 '.repeat(80),
                  impact: 'High impact',
                  source: 'Very Long Publisher Name '.repeat(8),
                  url: 'https://example.com/' + 'long-path/'.repeat(20)
                }
              ]
            }
          ]
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('overflow-wrap: anywhere');
    expect(result.page_html).not.toMatch(/html\s*,\s*body\s*\{[^}]*overflow\s*:\s*hidden/i);
    expect(result.page_html).not.toContain('height: 100vh');
    expect(result.page_html).not.toContain('height:100vh');
    expect(result.page_html).toContain(longTitle.slice(0, 60));
  });

  it('returns system_error for invalid JSON inputs', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: 'AI',
      report_json: '{bad json',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('report_json 不是合法 JSON');
    expect(result.page_html).toBe('');
  });

  it('does not crash when report sections are empty arrays from upstream AI', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '人工智能 / AI Agent / 大模型基础设施',
      competitors: 'OpenAI, Anthropic, Google Gemini, NVIDIA, DeepSeek, Replit',
      regions: '全球、中国、北美',
      report_date: '2026-06-05',
      report_json: JSON.stringify({
        input: {
          preparedFor: '今日报告',
          companyOrProduct: ['AI Agent', '大模型应用', '企业 AI 平台']
        },
        cover: {},
        verdict: {},
        newsWall: [],
        signals: [],
        radar: [],
        impacts: [],
        actions: [],
        sources: []
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('人工智能 / AI Agent / 大模型基础设施');
    expect(result.page_html).toContain('趋势雷达');
    expect(result.page_html).toContain('判断：');
    expect(result.page_cover).toContain('未来洞察系统');
  });

  it('renders full report_json with common upstream section field names', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '人工智能 / AI Agent / 大模型基础设施',
      competitors: 'OpenAI, Anthropic, Google Gemini, NVIDIA, DeepSeek, Replit',
      regions: '全球、中国、北美',
      report_date: '2026-06-05',
      report_json: JSON.stringify({
        cover: {
          subtitle: 'AI Agent、基础设施和企业平台的每日变化压缩。',
          tags: ['Agents', 'Infra', 'Enterprise AI']
        },
        verdict: {
          headline: '企业 AI 平台进入执行效率竞争',
          bullets: [
            '模型能力差距缩小后，交付链路和工作流稳定性变得更重要。',
            '短期需要盯住开发者工具和企业集成入口。'
          ]
        },
        newsWall: [
          {
            title: 'AI 编程平台加速企业化',
            summary: '开发者工具开始从个人效率转向团队协作和治理。',
            impact: '高',
            source: 'Example News',
            url: 'https://example.com/agent-platform'
          }
        ],
        signals: [
          {
            level: 'High',
            title: '应用层开始抢占工作流入口',
            description: '真正的竞争点从模型调用转向端到端任务完成。'
          }
        ],
        radar: [
          {
            trend: '企业 Agent 工作流',
            phase: 'Now'
          }
        ],
        impacts: [
          {
            title: '产品节奏',
            judgement: '需要把每日信号更快转成插件能力和模板沉淀。'
          }
        ],
        actions: [
          {
            day: 'Day 1',
            task: '整理重点竞品的企业 AI 平台入口',
            steps: ['补全公开链接', '提炼功能差异', '生成跟进任务']
          }
        ],
        sources: [
          {
            title: 'Example News',
            url: 'https://example.com/agent-platform'
          }
        ]
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('AI Agent、基础设施和企业平台的每日变化压缩');
    expect(result.page_html).toContain('企业 AI 平台进入执行效率竞争');
    expect(result.page_html).toContain('应用层开始抢占工作流入口');
    expect(result.page_html).toContain('企业 Agent 工作流');
    expect(result.page_html).toContain('整理重点竞品的企业 AI 平台入口');
    expect(result.page_html).toContain('https://example.com/agent-platform');
  });

  it('uses top-level prepared_for and renders verdict bullets as a list', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: 'AI Agent',
      prepared_for: '今日报告',
      report_json: JSON.stringify({
        verdict: {
          headline: '今日结论',
          bullets: [
            'OpenRouter、Replit 和企业 AI 平台的入口变化需要连续跟踪，不能过早截断。',
            '短期重点是把新闻转成产品动作。'
          ]
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('给 今日报告 的每日简报');
    expect(result.page_html).toContain('class="verdict-list"');
    expect(result.page_html).toContain(
      'OpenRouter、Replit 和企业 AI 平台的入口变化需要连续跟踪，不能过早截断。'
    );
    expect(result.page_html).not.toContain('给 Decision Brief 的每日简报');
  });

  it('does not duplicate action task text and renders sourceName', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const task = '梳理现有 AI 应用中最耗 token 的 3 个流程';
    const result = await tool({
      industry: '企业 AI 平台',
      report_json: JSON.stringify({
        actions: [
          {
            day: '今天',
            task
          },
          {
            title: '评估 Agent 化流程',
            tasks: ['判断是否适合 Agent 化', '列出风险点']
          }
        ],
        sources: [
          {
            title: 'OpenAI 发布企业 AI 相关更新',
            sourceName: 'OpenAI',
            url: 'https://example.com/openai'
          }
        ]
      }),
      page_output_mode: 'raw_html'
    });

    const occurrences = result.page_html.split(task).length - 1;
    expect(result.system_error).toBeUndefined();
    expect(occurrences).toBe(1);
    expect(result.page_html).toContain('评估 Agent 化流程');
    expect(result.page_html).toContain('<strong>OpenAI</strong>');
  });

  it('includes mobile layout rules that avoid narrow-screen overlap', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '全球 AI 基础设施',
      report_json: JSON.stringify({}),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('@media (max-width: 700px)');
    expect(result.page_html).toContain('@media (max-width: 420px)');
    expect(result.page_html).toContain('.visual-bands { position: relative;');
    expect(result.page_html).toContain('.visual-panels { grid-template-columns: 1fr;');
    expect(result.page_html).toContain('overflow-x: hidden');
  });

  it('uses richer generated image URLs for radar visuals when provided', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '医疗 AI',
      report_json: JSON.stringify({
        radar: {
          visual: {
            image_url: 'https://example.com/generated-medical-ai-radar.png',
            caption: '医疗 AI 趋势雷达生成图'
          }
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('<figure class="radar-visual image">');
    expect(result.page_html).toContain('https://example.com/generated-medical-ai-radar.png');
    expect(result.page_html).toContain('医疗 AI 趋势雷达生成图');
    expect(result.page_html).not.toContain('Visual Placeholder');
  });

  it('keeps the cover background close to the magazine reference and verdict compact', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '医疗 AI',
      report_json: JSON.stringify({}),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('radial-gradient(circle at 18% 18%');
    expect(result.page_html).toContain(
      'linear-gradient(135deg, #06070a 0%, #141823 52%, #06070a 100%)'
    );
    expect(result.page_html).toContain('.verdict { width: 100%; padding: 19px;');
    expect(result.page_html).toContain(
      '.verdict h2 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(27px, 3.2vw, 32px);'
    );
  });

  it('renders generated cover image as a subtle bottom background and keeps cover tall on mobile', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '医疗 AI 最近 30 天',
      report_json: JSON.stringify({
        cover: {
          visual: {
            image_url: 'https://example.com/generated-cover-medical-ai.png',
            caption: '医疗 AI 封面背景图'
          }
        }
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('class="hero has-cover-image"');
    expect(result.page_html).toContain('class="hero-bg-image"');
    expect(result.page_html).toContain('class="cover-highlights"');
    expect(result.page_html).toContain('class="cover-content"');
    expect(result.page_html).toContain('https://example.com/generated-cover-medical-ai.png');
    expect(result.page_html).toContain(
      '.hero > :not(.hero-bg-image) { position: relative; z-index: 2; }'
    );
    expect(result.page_html).toContain('.hero { position: relative; min-height: 660px;');
    expect(result.page_html).toContain(
      '.cover-content { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(250px, .7fr);'
    );
    expect(result.page_html).toContain('.cover-highlights { grid-column: 2; grid-row: 1 / span 2;');
    expect(result.page_html).toContain('.hero { min-height: 610px;');
    expect(result.page_html).toContain('.hero { min-height: 600px;');
    expect(result.page_html).toContain('mask-image: linear-gradient(180deg, transparent 0%');
    expect(result.page_html).toContain('#000 100%); pointer-events: none; }');
  });

  it('renders up to two optional generated image panels beyond radar', async () => {
    const { tool } = await import('../children/future_insight_system_report_html/src');
    const result = await tool({
      industry: '医疗 AI',
      report_json: JSON.stringify({
        visuals: [
          {
            title: '被动健康监测入口',
            caption: '手机摄像头、可穿戴和院外筛查正在形成新入口。',
            image_url: 'https://example.com/passive-health-monitoring.png'
          },
          {
            title: '医疗机构 Agent 流程',
            description: '院内运营和随访流程开始被 Agent 化。',
            url: 'https://example.com/medical-agent-workflow.png'
          },
          {
            title: '第三张不应渲染',
            image_url: 'https://example.com/third-image.png'
          }
        ]
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('class="visual-panels"');
    expect(result.page_html).toContain('被动健康监测入口');
    expect(result.page_html).toContain('https://example.com/passive-health-monitoring.png');
    expect(result.page_html).toContain('https://example.com/medical-agent-workflow.png');
    expect(result.page_html).not.toContain('https://example.com/third-image.png');
  });

  it('normalizes list fields from strings and JSON arrays', () => {
    const report = normalizeFutureInsightReport({
      industry: '能源科技',
      competitors: JSON.stringify(['A 公司', 'B 公司']),
      regions: '全球，中国',
      report_json: JSON.stringify({
        input: {
          companyOrProduct: ['iPolloOS', 'iPollo APP']
        }
      })
    });

    expect(report.input.companyOrProduct).toEqual(['iPolloOS', 'iPollo APP']);
    expect(report.input.competitors).toEqual(['A 公司', 'B 公司']);
    expect(report.input.regions).toEqual(['全球', '中国']);
  });
});
