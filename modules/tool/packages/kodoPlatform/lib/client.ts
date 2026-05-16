import qiniu from 'qiniu';
import { z } from 'zod';

export const KodoAuthFields = z.object({
  qiniuAccessKey: z.string().min(1),
  qiniuSecretKey: z.string().min(1),
  qiniuBucket: z.string().min(1),
  qiniuPublicBaseUrl: z.string().min(1)
});

export type KodoAuthFieldsIn = z.infer<typeof KodoAuthFields>;

export function createMac(auth: KodoAuthFieldsIn) {
  return new qiniu.auth.digest.Mac(auth.qiniuAccessKey, auth.qiniuSecretKey);
}

export function createKodoConfig() {
  return new qiniu.conf.Config({ useHttpsDomain: true });
}

export function createFormUploader() {
  return new qiniu.form_up.FormUploader(createKodoConfig());
}

export function buildUploadToken(
  mac: ReturnType<typeof createMac>,
  bucket: string,
  key: string,
  expiresSeconds: number
) {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${bucket}:${key}`,
    expires: expiresSeconds
  });
  return putPolicy.uploadToken(mac);
}

export function createBucketManager(mac: ReturnType<typeof createMac>) {
  return new qiniu.rs.BucketManager(mac, createKodoConfig());
}
