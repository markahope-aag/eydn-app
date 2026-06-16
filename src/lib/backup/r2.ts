import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client for off-platform backups.
 *
 * R2 is S3-compatible. Credentials are a scoped R2 API token (read+write),
 * stored only in the deployment environment — never in the repo.
 *
 * Env vars required:
 *   R2_ENDPOINT          — https://<account>.r2.cloudflarestorage.com
 *   R2_BUCKET            — bucket name (eydn-app)
 *   R2_ACCESS_KEY_ID     — R2 token access key id
 *   R2_SECRET_ACCESS_KEY — R2 token secret
 */

const ENDPOINT = process.env.R2_ENDPOINT;
const BUCKET = process.env.R2_BUCKET;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

export function isR2Configured(): boolean {
  return Boolean(ENDPOINT && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

export function r2Bucket(): string {
  if (!BUCKET) throw new Error("R2_BUCKET is not configured");
  return BUCKET;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured — set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY."
    );
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: ENDPOINT,
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
    });
  }
  return client;
}

/** Upload an object to R2. Returns the key on success; throws on failure. */
export async function putObject(
  key: string,
  body: string | Buffer,
  contentType = "application/json"
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

/** Fetch an object's body as a string. Throws if it does not exist. */
export async function getObjectText(key: string): Promise<string> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
  if (!res.Body) throw new Error(`Empty body for ${key}`);
  return res.Body.transformToString();
}

/** True if an object exists at the key. */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

export interface R2Object {
  key: string;
  size: number;
  lastModified?: Date;
}

/** List objects under a prefix (handles pagination). */
export async function listObjects(prefix: string): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let token: string | undefined;
  do {
    const res = await getClient().send(
      new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: prefix, ContinuationToken: token })
    );
    for (const o of res.Contents || []) {
      if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0, lastModified: o.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}
