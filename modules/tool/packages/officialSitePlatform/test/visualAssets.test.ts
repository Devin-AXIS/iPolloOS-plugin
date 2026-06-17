import { describe, expect, test } from 'vitest';
import { tool } from '../children/official_website_page/src';

describe('official website visual assets', () => {
  test('renders image URLs as media instead of visible copy', async () => {
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://os.ipollo.net';

    const result = await tool({
      brand_name: '宝马',
      company_profile:
        '宝马（BMW）汽车品牌展示官网概念页。可用视觉素材：首屏汽车图 https://ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com/chat/a/b/hero.png ；SUV车型图 https://ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com/chat/a/b/suv.png ；智能座舱图 https://ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com/chat/a/b/cockpit.png 。',
      theme_note:
        '高端豪华汽车官网质感。请优先使用用户提供的三张汽车视觉素材作为首屏、车型展示和智能科技配图。',
      nav_items: '首页|#top, 车型亮点|#models, 智能科技|#tech, 预约试驾|#contact'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('class="official-hero-media"');
    expect(result.page_html).toContain(
      '<img src="https://os.ipollo.net/chat/a/b/hero.png" alt="首屏汽车图"/>'
    );
    expect(result.page_html).toContain('https://os.ipollo.net/chat/a/b/suv.png');
    expect(result.page_html).not.toContain('ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com');
    expect(result.page_html).not.toContain('可用视觉素材');
  });

  test('accepts explicit visual_assets input', async () => {
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://os.ipollo.net';

    const result = await tool({
      brand_name: 'Demo',
      company_profile: 'A concise product site.',
      visual_assets:
        'Hero|https://ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com/chat/demo/hero.webp\nDetail|https://ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com/chat/demo/detail.jpg'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain(
      '<img src="https://os.ipollo.net/chat/demo/hero.webp" alt="Hero"/>'
    );
    expect(result.page_html).toContain('https://os.ipollo.net/chat/demo/detail.jpg');
    expect(result.page_html).not.toContain('ipollo-plugin-pages-prod.oss-cn-beijing.aliyuncs.com');
  });
});
