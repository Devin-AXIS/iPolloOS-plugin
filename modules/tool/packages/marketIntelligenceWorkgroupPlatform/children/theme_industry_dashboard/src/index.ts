import {
  DashboardInputType,
  DashboardOutputType,
  createDashboardTool
} from '../../../lib/tool-runtime';

export const InputType = DashboardInputType;
export const OutputType = DashboardOutputType;

export const tool = createDashboardTool({
  reportType: 'theme_industry',
  fallbackTitle: '主题产业深度分析',
  summaryLabel: '主题产业看板'
});
