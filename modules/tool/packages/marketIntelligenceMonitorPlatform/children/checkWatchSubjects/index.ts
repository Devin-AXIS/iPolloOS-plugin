import config from './config';
import { InputType, OutputType, tool as toolCb } from './src';
import { exportTool } from '@tool/utils/tool';
import type { z } from 'zod';

export default exportTool<z.output<typeof InputType>, z.output<typeof OutputType>>({
  toolCb,
  InputType,
  OutputType,
  config
});
