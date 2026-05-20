import { describe, expect, it } from 'vitest';
import { buildMobileAiServicePrompt } from '../lib/prompt';

describe('prompt builder', () => {
  it('keeps agent capabilities and interaction freedom', () => {
    const prompt = buildMobileAiServicePrompt({
      userRequirement: '做一个短片创意工具',
      serviceLanguage: 'zh-CN',
      background: '面向移动端创作者',
      visualPrompt: '磨砂感',
      interactionMode: 'auto'
    });

    expect(prompt).toContain('深图');
    expect(prompt).toContain('深视频');
    expect(prompt).toContain('网络搜索');
    expect(prompt).toContain('能力底座');
    expect(prompt).toContain('工具调用和 Agent 编排');
    expect(prompt).toContain('不要生成一个与这些能力脱节的普通静态页面');
    expect(prompt).toContain('必须开发功能性应用');
    expect(prompt).toContain('不是展示性页面');
    expect(prompt).toContain('控件可用');
    expect(prompt).toContain('page_html');
    expect(prompt).toContain('具体交互形态');
    expect(prompt).toContain('不要默认只能聊天');
  });
});
