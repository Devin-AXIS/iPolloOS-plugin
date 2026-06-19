import {
  DashboardInputType,
  DashboardOutputType,
  createDashboardTool
} from '../../../lib/tool-runtime';

export const InputType = DashboardInputType;
export const OutputType = DashboardOutputType;

export const tool = createDashboardTool({
  reportType: 'people_institution',
  fallbackTitle: '人物机构深度分析',
  summaryLabel: '人物机构看板'
});
