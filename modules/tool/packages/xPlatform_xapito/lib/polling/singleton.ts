import { getLogger, mod } from '@/logger';
import { loadXPollingConfig } from './config';
import { XPollingService } from './service';

let service: XPollingService | null = null;

export function getXPollingService(): XPollingService {
  if (!service) {
    service = new XPollingService(loadXPollingConfig(), undefined, getLogger(mod.tool));
  }
  return service;
}

export async function startXPollingService() {
  if (process.env.X_LEGACY_INTERNAL_POLLING_ENABLED !== 'true') {
    return;
  }
  await getXPollingService().start();
}

export async function stopXPollingService() {
  if (!service) return;
  await service.stop();
}
