import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export class R2ValidationError extends Error {}

export function toPublicCoverImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  const publicBaseUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!publicBaseUrl) {
    return trimmedUrl;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return trimmedUrl;
  }

  if (!parsedUrl.hostname.endsWith(".r2.cloudflarestorage.com")) {
    return trimmedUrl;
  }

  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) {
    return trimmedUrl;
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0] !== bucket) {
    return trimmedUrl;
  }

  const objectKey = segments.slice(1).join("/");
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${objectKey}`;
}

function getR2Config() {
  const endpoint = process.env.R2_URL?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketFromUrl = endpoint
    ? new URL(endpoint).pathname.split("/").filter(Boolean)[0]
    : undefined;
  const bucket = process.env.R2_BUCKET?.trim() ?? bucketFromUrl;

  if (!endpoint || !bucket) {
    throw new Error("R2_URL and R2_BUCKET are required for uploads.");
  }

  const hasS3Credentials = Boolean(accessKeyId && secretAccessKey);

  if (!hasS3Credentials) {
    throw new Error(
      "Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY for uploads."
    );
  }

  const resolvedAccessKeyId = accessKeyId as string;
  const resolvedSecretAccessKey = secretAccessKey as string;

  const publicBaseUrl = process.env.R2_PUBLIC_URL?.trim();

  if (!publicBaseUrl) {
    throw new Error(
      "R2_PUBLIC_URL is required and must point to a public R2.dev/custom domain."
    );
  }

  return {
    endpoint,
    accessKeyId: resolvedAccessKeyId,
    secretAccessKey: resolvedSecretAccessKey,
    bucket,
    publicBaseUrl,
  };
}

async function uploadViaS3Api(params: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  objectKey: string;
  file: File;
}) {
  const s3 = new S3Client({
    region: "auto",
    endpoint: params.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.objectKey,
      Body: Buffer.from(await params.file.arrayBuffer()),
      ContentType: params.file.type,
    })
  );
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export function validateCoverImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new R2ValidationError(
      "Unsupported image type. Use JPG, PNG, WebP, or GIF."
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new R2ValidationError("Image exceeds 5MB limit.");
  }
}

export async function uploadCoverImageToR2(file: File, userId: number) {
  validateCoverImage(file);

  const {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
  } = getR2Config();
  const extension = extensionForMimeType(file.type);
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const objectKey = `covers/${userId}/${Date.now()}-${randomSuffix}.${extension}`;

  await uploadViaS3Api({
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    objectKey,
    file,
  });

  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${objectKey}`;
}
