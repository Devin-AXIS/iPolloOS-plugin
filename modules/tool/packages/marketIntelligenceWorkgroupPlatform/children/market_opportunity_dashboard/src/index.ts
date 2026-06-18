import {
  DashboardInputType,
  DashboardOutputType,
  createDashboardTool
} from '../../../lib/tool-runtime';

export const InputType = DashboardInputType;
export const OutputType = DashboardOutputType;

export const tool = createDashboardTool({
  reportType: 'market_opportunity',
  fallbackTitle: '今日机会发现',
  summaryLabel: '机会发现看板'
});
