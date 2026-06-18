import {
  DashboardInputType,
  DashboardOutputType,
  createDashboardTool
} from '../../../lib/tool-runtime';

export const InputType = DashboardInputType;
export const OutputType = DashboardOutputType;

export const tool = createDashboardTool({
  reportType: 'ticker_event',
  fallbackTitle: '单股事件复盘',
  summaryLabel: '单股事件看板'
});
