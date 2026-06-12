import config from './config';
import { InputType, OutputType, tool as toolCb } from '../../lib/tool';
import { exportTool } from '@tool/utils/tool';

export default exportTool({
  toolCb,
  InputType,
  OutputType,
  config
});
