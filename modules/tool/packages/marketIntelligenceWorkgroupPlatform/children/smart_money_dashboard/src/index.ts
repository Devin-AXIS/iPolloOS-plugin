import {
  DashboardInputType,
  DashboardOutputType,
  createDashboardTool
} from '../../../lib/tool-runtime';

export const InputType = DashboardInputType;
export const OutputType = DashboardOutputType;

export const tool = createDashboardTool({
  reportType: 'smart_money',
  fallbackTitle: 'Smart Money 资金雷达',
  summaryLabel: 'Smart Money 看板'
});
