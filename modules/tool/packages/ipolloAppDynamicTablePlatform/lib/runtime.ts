import type { RunToolSecondParamsType } from '@tool/type/req';

type RuntimeContextInput = {
  requireUser?: boolean;
};

const firstNonEmpty = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
};

const envString = (key: string) => String(process.env[key] ?? '').trim() || undefined;

const envUrlSearchParam = (envKey: string, key: string) => {
  const rawUrl = envString(envKey);
  if (!rawUrl) return;

  try {
    return new URL(rawUrl).searchParams.get(key)?.trim() || undefined;
  } catch {
    return;
  }
};

export function resolveDynamicTableRuntimeContext(
  input: RuntimeContextInput,
  systemVar?: RunToolSecondParamsType['systemVar']
) {
  const runtimeApp = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    applicationId?: string;
    iPolloApplicationId?: string;
    agentId?: string;
    appBotId?: string;
    upstreamAppId?: string;
  };
  const runtimeUser = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    app_user_id?: string;
    app_user_name?: string;
    app用户id?: string;
    app用户名?: string;
    iPolloAppUserId?: string;
    ipolloAppUserId?: string;
    iPolloAppUserName?: string;
    ipolloAppUserName?: string;
    ipolloUserName?: string;
    ipollo_user_name?: string;
    appUserName?: string;
    appAuthToken?: string;
    __ipolloAppAuthToken?: string;
    iPolloApplicationId?: string;
  };

  const applicationId = firstNonEmpty(
    runtimeApp?.applicationId,
    runtimeApp?.iPolloApplicationId,
    runtimeUser?.iPolloApplicationId,
    envString('IPOLLO_APP_APPLICATION_ID'),
    envUrlSearchParam('IPOLLO_APP_REGISTER_URL', 'applicationId'),
    systemVar?.app?.id
  );

  const userId = firstNonEmpty(
    systemVar?.user?.appUserId,
    runtimeUser?.iPolloAppUserId,
    runtimeUser?.ipolloAppUserId,
    runtimeUser?.app_user_id,
    runtimeUser?.['app用户id']
  );
  const userName = firstNonEmpty(
    runtimeUser?.appUserName,
    runtimeUser?.app_user_name,
    runtimeUser?.['app用户名'],
    runtimeUser?.iPolloAppUserName,
    runtimeUser?.ipolloAppUserName,
    runtimeUser?.ipolloUserName,
    runtimeUser?.ipollo_user_name,
    systemVar?.user?.username,
    systemVar?.user?.membername,
    systemVar?.user?.name
  );
  const authToken = firstNonEmpty(runtimeUser?.appAuthToken, runtimeUser?.__ipolloAppAuthToken);
  const agentId = firstNonEmpty(
    runtimeApp?.appBotId,
    runtimeApp?.agentId,
    runtimeApp?.upstreamAppId,
    systemVar?.app?.id
  );

  if (!applicationId) {
    throw new Error('缺少运行时 iPollo App 信息，无法定位当前应用。');
  }
  if (input.requireUser && !userId) {
    throw new Error('缺少运行时 iPollo 用户信息，无法管理动态表记录。');
  }

  return {
    applicationId,
    userId,
    userName,
    authToken,
    agentId,
    identitySource: authToken ? 'runtime_token' : 'runtime_context'
  };
}
