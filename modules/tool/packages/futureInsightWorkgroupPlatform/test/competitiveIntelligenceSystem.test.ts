import { describe, expect, it } from 'vitest';

const dossier = {
  title: 'Alpha AI · 企业竞争情报',
  summary: 'Alpha AI 正在从工具产品进入企业平台竞争，需要核验财务质量、客户集中和生态依赖。',
  tags: ['AI Agent', '企业平台', '竞品'],
  metrics: [
    { label: '财务可见度', value: 72, note: '融资和客户线索较完整。' },
    { label: '商业动能', value: 68, note: '客户和渠道信号正在增加。' }
  ],
  sections: [
    {
      label: 'Finance',
      title: '财务质量与客户线索',
      body: '公开财务信息有限，但融资、招聘、客户案例和渠道合作可以形成旁证。',
      bullets: ['继续核验收入质量和客户集中度。'],
      bars: [
        { label: '融资可见', value: 82, note: '融资新闻和投资方公开。' },
        { label: '收入质量', value: 55, note: '需要更多客户和合同证据。' }
      ],
      evidence: [
        {
          label: 'Company Site',
          title: '官网披露企业 AI 平台定位',
          note: '用于确认产品和目标客户口径。'
        },
        { label: '融资新闻', title: '融资和客户线索可作为财务旁证', note: '不能替代正式财报。' }
      ]
    }
  ],
  entities: [
    {
      id: 'alpha',
      name: 'Alpha AI',
      type: '公司',
      summary: '目标公司',
      facts: ['企业平台', 'Agent 工具']
    },
    {
      id: 'ceo',
      name: 'Chen Wei',
      type: '人物',
      summary: '核心高管',
      facts: ['创始人', '公开演讲']
    }
  ],
  relations: [
    { from: 'alpha', to: 'ceo', label: '创始关系', strength: 86, proof: '官网和访谈互相印证。' }
  ],
  sources: [
    { publisher: 'Company Site', title: 'Alpha AI product page', url: 'https://example.com/alpha' }
  ]
};

describe('competitive_intelligence_system', () => {
  it('renders company dossier with charts, sources and page cover', async () => {
    const { tool } = await import('../children/competitive_intelligence_company_dossier/src');
    const result = await tool({
      company_name: 'Alpha AI',
      industry: 'AI Agent',
      dossier_json: JSON.stringify(dossier),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('竞争情报系统');
    expect(result.page_html).toContain('Alpha AI · 企业竞争情报');
    expect(result.page_html).toContain('财务质量与客户线索');
    expect(result.page_html).toContain('ci-bar-row');
    expect(result.page_html).toContain('https://example.com/alpha');
    expect(result.page_cover).toContain('competitive-intelligence');
    expect(result.page_cover).toContain('企业档案');
    expect(result.page_html).not.toMatch(/Apoll[o]/);
  });

  it('uses company logo or person portrait as a masked magazine cover visual', async () => {
    const companyTool = await import('../children/competitive_intelligence_company_dossier/src');
    const personTool = await import('../children/competitive_intelligence_person_dossier/src');

    const company = await companyTool.tool({
      company_name: 'Alpha AI',
      industry: 'AI Agent',
      image_search_query: 'Alpha AI official logo',
      logo_url: 'https://example.com/alpha-logo.png',
      dossier_json: JSON.stringify(dossier),
      page_output_mode: 'raw_html'
    });
    const person = await personTool.tool({
      person_name: 'Chen Wei',
      industry: 'AI Agent',
      image_search_query: 'Chen Wei Alpha AI photo',
      portrait_image_url: 'https://example.com/chen-wei.jpg',
      dossier_json: JSON.stringify({ ...dossier, title: 'Chen Wei · 人物档案' }),
      page_output_mode: 'raw_html'
    });

    expect(company.system_error).toBeUndefined();
    expect(person.system_error).toBeUndefined();
    expect(company.page_html).toContain('cover-art has-image mode-logo');
    expect(company.page_html).toContain('https://example.com/alpha-logo.png');
    expect(company.page_cover).toContain('https://example.com/alpha-logo.png');
    expect(person.page_html).toContain('cover-art has-image mode-portrait');
    expect(person.page_html).toContain('https://example.com/chen-wei.jpg');
    expect(person.page_cover).toContain('https://example.com/chen-wei.jpg');
  });

  it('renders person and product templates as different dossier pages', async () => {
    const personTool = await import('../children/competitive_intelligence_person_dossier/src');
    const productTool = await import('../children/competitive_intelligence_product_dossier/src');

    const person = await personTool.tool({
      person_name: 'Chen Wei',
      industry: 'AI Agent',
      dossier_json: JSON.stringify({ ...dossier, title: 'Chen Wei · 人物档案' }),
      page_output_mode: 'raw_html'
    });
    const product = await productTool.tool({
      product_name: 'Alpha Agent Platform',
      industry: '企业 AI 平台',
      dossier_json: JSON.stringify({ ...dossier, title: 'Alpha Agent Platform · 产品技术档案' }),
      page_output_mode: 'raw_html'
    });

    expect(person.system_error).toBeUndefined();
    expect(product.system_error).toBeUndefined();
    expect(person.page_html).toContain('Person Dossier');
    expect(product.page_html).toContain('Product &amp; Technology Dossier');
    expect(person.page_cover).toContain('人物档案');
    expect(product.page_cover).toContain('产品技术档案');
  });

  it('does not invent person resume scores when upstream only provides facts and entities', async () => {
    const { tool } = await import('../children/competitive_intelligence_person_dossier/src');
    const result = await tool({
      person_name: '孔剑平',
      industry: 'Web3 基础设施',
      dossier_json: JSON.stringify({
        title: '孔剑平人物档案',
        summary: '公开资料显示，孔剑平与 Nano Labs、嘉楠科技等公司存在任职和业务关联。',
        metrics: [
          { label: '当前核心职务', value: 'Nano Labs董事长兼CEO', note: '公司 IR 披露' },
          { label: '教育背景', value: '温州大学法学学士；清华大学硕士', note: '公开履历口径' }
        ],
        entities: [
          {
            id: 'nano',
            name: 'Nano Labs Ltd',
            type: '上市公司',
            relationship: '当前任职公司',
            period: '2021 年 1 月起',
            facts: ['董事长兼 CEO', '纳斯达克上市公司']
          },
          {
            id: 'canaan',
            name: 'Canaan Inc. 嘉楠科技',
            type: '上市公司',
            relationship: '历史任职公司',
            period: '2018.05-2020.07'
          }
        ]
      }),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('公司与对象关联');
    expect(result.page_html).toContain('data-entity-open="nano"');
    expect(result.page_html).toContain('返回关联对象');
    expect(result.page_html).toContain('温州大学法学学士；清华大学硕士');
    expect(result.page_html).not.toContain('图形验证');
    expect(result.page_html).not.toContain('图像验证');
    expect(result.page_html).not.toContain('指标证据');
    expect(result.page_html).not.toContain('可点击对象');
    expect(result.page_html).not.toContain('学历履历');
    expect(result.page_html).not.toContain('图表用于把文字判断落到可扫描指标');
    expect(result.page_html).not.toContain('该对象需要继续补充小档案');
    expect(result.page_html).not.toContain('cover-art abstract');
    expect(result.page_html).not.toContain('shape one');
  });

  it('keeps procedural bullets out of right-side evidence cards when real evidence is provided', async () => {
    const { tool } = await import('../children/competitive_intelligence_person_dossier/src');
    const result = await tool({
      person_name: '孔剑平',
      industry: 'Web3 基础设施',
      dossier_json: JSON.stringify({
        title: '孔剑平人物档案',
        summary: '公开资料显示，孔剑平与 Nano Labs、嘉楠科技等公司存在任职和业务关联。',
        tags: ['人物背景', '公司关联', '公开履历', '关系核验'],
        sections: [
          {
            label: 'Profile',
            title: '履历与公司关系需要分开核验',
            body: '人物档案优先展示可确认的任职、教育、投资和公开发言。',
            bullets: ['先确认主体身份和姓名别名', '再核验公司任职、董事会、投资或顾问关系'],
            evidence: [
              { label: 'IR', title: 'Nano Labs 董事长兼 CEO', note: '来自公司公开资料。' },
              { label: '履历', title: '嘉楠科技历史关联', note: '需要按公告时间段继续复核。' },
              {
                label: '任命',
                title: '香港数码港相关任命应按个人节点处理',
                note: '个人任命与公司商业合作需要分开。'
              }
            ]
          }
        ],
        entities: [
          { id: 'nano', name: 'Nano Labs Ltd', type: '上市公司', summary: '当前任职公司' },
          {
            id: 'canaan',
            name: 'Canaan Inc. 嘉楠科技',
            type: '历史关联公司',
            summary: '历史履历关联'
          },
          { id: 'cyberport', name: '香港数码港', type: '机构', summary: '公开任命节点' }
        ]
      }),
      page_output_mode: 'raw_html'
    });
    const tagRow = result.page_html.match(/<div class="tag-row">([\s\S]*?)<\/div>/)?.[1] || '';

    expect(result.system_error).toBeUndefined();
    expect(tagRow).toContain('Nano Labs');
    expect(tagRow).toContain('嘉楠科技');
    expect(tagRow).toContain('香港数码港');
    expect(tagRow).not.toContain('公司关联');
    expect(result.page_html).toContain('Nano Labs 董事长兼 CEO');
    expect(result.page_html).toContain('嘉楠科技历史关联');
    expect(result.page_html).not.toContain(
      '<small>01</small>\\n          <strong>先确认主体身份和姓名别名</strong>'
    );
  });

  it('renders relation overview with clickable entity drilldown and left back action', async () => {
    const { tool } = await import('../children/competitive_intelligence_relation_overview/src');
    const result = await tool({
      relation_subject: 'Alpha AI / Beta Cloud / Chen Wei',
      industry: '企业 AI 平台',
      dossier_json: JSON.stringify({
        ...dossier,
        title: 'Alpha AI 与 Beta Cloud 关系概览',
        metrics: [
          { label: '身份匹配', value: 82, note: '主体和别名已对齐。' },
          { label: '关系强度', value: 64, note: '新闻和合作伙伴证据显示中等强度。' },
          { label: '商业相关', value: 76, note: '关系影响合作和竞争判断。' },
          { label: '风险冲突', value: 42, note: '仍需核验竞业和合规风险。' }
        ]
      }),
      entities_json: JSON.stringify([
        {
          id: 'alpha',
          name: 'Alpha AI',
          type: '公司',
          summary: '目标企业',
          facts: ['企业 AI 平台', '目标客户为中大型组织']
        },
        {
          id: 'beta',
          name: 'Beta Cloud',
          type: '公司',
          summary: '云基础设施伙伴',
          facts: ['供应算力', '也服务竞品']
        },
        {
          id: 'chen',
          name: 'Chen Wei',
          type: '人物',
          summary: '关键人物',
          facts: ['创始人', '公开发言']
        }
      ]),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('Relationship Overview');
    expect(result.page_html).toContain('data-relation-overview');
    expect(result.page_html).toContain('data-entity-open="alpha"');
    expect(result.page_html).toContain('返回关系概览');
    expect(result.page_cover).toContain('关系概览');
  });

  it('does not render zero relationship strength as a score', async () => {
    const { tool } = await import('../children/competitive_intelligence_relation_overview/src');
    const result = await tool({
      relation_subject: '孔剑平 / 香港数码港 / Nano Labs',
      industry: 'Web3 / 香港数字科技',
      dossier_json: JSON.stringify({
        title: '孔剑平与香港数码港关系概览',
        summary: '公开证据支持个人董事任命关系，但不支持直接推导 Nano Labs 与数码港存在商业合作。',
        relations: [
          {
            from: 'kong',
            to: 'cyberport',
            label: '委任为香港数码港管理有限公司董事',
            strength: 0,
            proof: '香港政府公报确认任命。'
          },
          {
            from: 'kong',
            to: 'nano',
            label: '董事会主席兼CEO',
            strength: 0,
            proof: 'Nano Labs IR 公开资料。'
          }
        ]
      }),
      entities_json: JSON.stringify([
        { id: 'kong', name: '孔剑平', type: '人物', summary: '关系中的个人节点' },
        { id: 'cyberport', name: '香港数码港', type: '机构', summary: '香港数字科技平台' },
        { id: 'nano', name: 'Nano Labs', type: '公司', summary: '孔剑平任职公司' }
      ]),
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('委任为香港数码港管理有限公司董事');
    expect(result.page_html).toContain('未提供可信关系强度，插件不展示分数。');
    expect(result.page_html).not.toContain('<b>0</b>');
    expect(result.page_html).not.toContain('/ 0');
  });

  it('returns system_error for malformed structured input instead of crashing', async () => {
    const { tool } = await import('../children/competitive_intelligence_company_dossier/src');
    const result = await tool({
      company_name: 'Alpha AI',
      dossier_json: '{bad json',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('dossier_json 不是合法 JSON');
    expect(result.page_html).toBe('');
  });
});
