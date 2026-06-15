import type { RunToolSecondParamsType } from '@tool/type/req';

type RuntimeIdentityInput = {
  applicationId?: string;
  userId?: string;
  dispatchChannel?: 'local' | 'system';
};

const firstNonEmpty = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
};

const envString = (key: string) => String(process.env[key] ?? '').trim() || undefined;

export function resolveRuntimeIdentity(
  input: RuntimeIdentityInput,
  systemVar?: RunToolSecondParamsType['systemVar']
) {
  const runtimeApp = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    applicationId?: string;
    appApplicationId?: string;
    iPolloApplicationId?: string;
    ipolloApplicationId?: string;
  };
  const runtimeUser = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    app_user_id?: string;
    app用户id?: string;
    iPolloAppUserId?: string;
    ipolloAppUserId?: string;
    appAuthToken?: string;
    __ipolloAppAuthToken?: string;
    appApplicationId?: string;
    iPolloApplicationId?: string;
    ipolloApplicationId?: string;
  };
  const applicationId = firstNonEmpty(
    input.applicationId,
    runtimeApp?.applicationId,
    runtimeApp?.iPolloApplicationId,
    runtimeApp?.ipolloApplicationId,
    runtimeApp?.appApplicationId,
    runtimeUser?.iPolloApplicationId,
    runtimeUser?.ipolloApplicationId,
    runtimeUser?.appApplicationId,
    envString('IPOLLO_APP_APPLICATION_ID'),
    systemVar?.app?.id
  );
  const trustedAppUserId = firstNonEmpty(
    systemVar?.user?.appUserId,
    runtimeUser?.iPolloAppUserId,
    runtimeUser?.ipolloAppUserId,
    runtimeUser?.app_user_id,
    runtimeUser?.['app用户id']
  );
  const userId = firstNonEmpty(input.userId, trustedAppUserId);
  const authToken = firstNonEmpty(runtimeUser?.appAuthToken, runtimeUser?.__ipolloAppAuthToken);

  if (!applicationId) {
    throw new Error('缺少运行时 iPollo App 信息，无法定位当前应用。');
  }

  if (!userId) {
    if (input.dispatchChannel === 'local') {
      const localUserId = firstNonEmpty(systemVar?.user?.id);
      if (localUserId) {
        return {
          applicationId,
          userId: localUserId,
          authToken,
          identitySource: 'local_system_user'
        };
      }
    }

    throw new Error('缺少可信 iPollo 用户 ID，无法查询或创建个人日程。');
  }

  return {
    applicationId,
    userId,
    authToken,
    identitySource: trustedAppUserId ? 'runtime_app_user' : 'system_user_id'
  };
}
