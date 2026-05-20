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

    expect(prompt).toContain('图像生成与理解');
    expect(prompt).toContain('视频生成与理解');
    expect(prompt).toContain('网络搜索');
    expect(prompt).toContain('语音识别');
    expect(prompt).toContain('Supabase 数据库读写');
    expect(prompt).toContain('工具调用与多步骤 Agent 编排能力');
    expect(prompt).toContain('不要在页面上罗列“AI 有哪些能力”');
    expect(prompt).toContain('window.iPolloOSAI.call');
    expect(prompt).toContain('不允许把 AI 结果、搜索结果、日程建议、图片分析、数据库结果写死');
    expect(prompt).toContain('最终结果必须来自 window.iPolloOSAI.call');
    expect(prompt).toContain('状态展示');
    expect(prompt).toContain('调用 Supabase 插件真实创建/使用数据库');
    expect(prompt).toContain('正在创建数据库');
    expect(prompt).toContain('语音输入规范');
    expect(prompt).toContain('Web Speech API');
    expect(prompt).toContain('MediaRecorder');
    expect(prompt).toContain('底部抽屉');
    expect(prompt).toContain('语音识别能力优先来自 iPolloOS AI 应用已配置的语音识别工具');
    expect(prompt).toContain('提交 iPolloOS Runtime');
    expect(prompt).toContain('不要因为浏览器不支持 Web Speech API 就判定“语音不可用”');
    expect(prompt).toContain('必要时再降级到文字输入');
    expect(prompt).toContain('主界面仍以应用内容和功能操作为主');
    expect(prompt).toContain('page_html');
    expect(prompt).toContain('以 </html> 结束');
    expect(prompt).toContain('CSS 控制在约 180 行以内');
  });
});
