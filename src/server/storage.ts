import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "~/env";

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "us-east-1", // RustFS 不校验 region,占位即可
  forcePathStyle: true, // RustFS / MinIO 走 path-style
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

/** 确保 bucket 存在(幂等)。 */
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  }
}

/** 上传对象。 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType = "application/zip",
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** 删除对象。 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

/** 签发短期(默认 60s)预签名下载 URL,带 attachment 文件名。 */
export async function getPresignedUrl(
  key: string,
  downloadName: string,
  expiresIn = 60,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadName}"`,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}
