import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, extname, join, resolve } from 'path';
import {
  PresignedUrlRequestDto,
  PresignedUrlResponseDto,
  StorageFileType,
  StorageFolder,
} from './dto/storage.dto';

/** Where the dev-stub fallback writes uploaded files (apps/backend/uploads).
 *  Resolved from `process.cwd()`, which is the backend's package root when
 *  started via `nest start` / `npm start`. */
export const DEV_UPLOADS_ROOT = resolve(process.cwd(), 'uploads');

interface FileTypePolicy {
  /** Allowed MIME-type prefixes (e.g. "image/") or full types. */
  allowedMimeTypes: string[];
  /** Max upload size in bytes. */
  maxSizeBytes: number;
  /** S3 object-key prefix the upload must target. */
  keyPrefix: string;
}

const KB = 1024;
const MB = 1024 * KB;

const POLICIES: Record<StorageFileType, FileTypePolicy> = {
  [StorageFileType.IMAGE]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'],
    maxSizeBytes: 10 * MB,
    keyPrefix: 'images',
  },
  [StorageFileType.VIDEO]: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
    maxSizeBytes: 500 * MB,
    keyPrefix: 'videos',
  },
  [StorageFileType.DOCUMENT]: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ],
    maxSizeBytes: 20 * MB,
    keyPrefix: 'documents',
  },
  [StorageFileType.MODEL_3D]: {
    allowedMimeTypes: [
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream', // some browsers report .glb this way
    ],
    maxSizeBytes: 50 * MB,
    keyPrefix: 'models',
  },
  [StorageFileType.AVATAR]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * MB,
    keyPrefix: 'avatars',
  },
  [StorageFileType.AGENCY_LOGO]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxSizeBytes: 5 * MB,
    keyPrefix: 'agencies/logos',
  },
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private bucket = '';
  private region = 'me-south-1';
  private cloudfrontUrl = '';
  private presignTtlSeconds = 900;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.bucket = this.config.get<string>('services.s3.bucket') ?? '';
    this.region = this.config.get<string>('services.s3.region') ?? 'me-south-1';
    this.cloudfrontUrl = (this.config.get<string>('services.s3.cloudfrontUrl') ?? '').replace(
      /\/$/,
      '',
    );
    this.presignTtlSeconds =
      this.config.get<number>('services.s3.presignExpiresSeconds') ?? 900;

    const accessKeyId = this.config.get<string>('services.aws.accessKeyId') ?? '';
    const secretAccessKey = this.config.get<string>('services.aws.secretAccessKey') ?? '';

    if (this.bucket && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`S3 client initialised (bucket=${this.bucket}, region=${this.region})`);
    } else {
      this.logger.warn(
        'S3 credentials or bucket not configured — StorageService will issue dev-stub URLs',
      );
    }
  }

  isConfigured(): boolean {
    return this.s3 !== null;
  }

  /**
   * Validates the request, then generates a pre-signed PUT URL.
   * Falls back to a dev-stub URL when S3 is not configured so frontend
   * upload code can be exercised without an AWS account.
   */
  async createPresignedUrl(
    userId: string,
    dto: PresignedUrlRequestDto,
  ): Promise<PresignedUrlResponseDto> {
    const policy = POLICIES[dto.fileType];
    if (!policy) {
      throw new BadRequestException(`Unsupported fileType: ${dto.fileType}`);
    }
    if (!isMimeAllowed(dto.mimeType, policy.allowedMimeTypes)) {
      throw new BadRequestException(
        `mimeType "${dto.mimeType}" is not allowed for fileType "${dto.fileType}"`,
      );
    }

    const ext = sanitiseExtension(dto.fileName, dto.mimeType);
    const objectKey = [
      dto.folder,
      policy.keyPrefix,
      userId,
      `${Date.now()}-${randomUUID()}${ext}`,
    ].join('/');

    if (!this.s3) {
      // Dev-stub fallback: route uploads to our own backend so they actually
      // land somewhere the browser can fetch from. The express middleware in
      // `main.ts` handles `/storage/dev-upload/<key>` (raw binary PUT) and
      // serves the resulting files statically at `/uploads/...`.
      //
      // Both routes are mounted at the server root, OUTSIDE the `/api`
      // versioned prefix — so we use only the origin of `app.apiUrl`.
      const apiUrl = this.config.get<string>('app.apiUrl') ?? 'http://localhost:3010';
      let origin: string;
      try {
        origin = new URL(apiUrl).origin;
      } catch {
        origin = 'http://localhost:3010';
      }
      const expiresAt = new Date(Date.now() + this.presignTtlSeconds * 1000).toISOString();
      return {
        uploadUrl: `${origin}/storage/dev-upload/${objectKey}`,
        objectKey,
        publicUrl: `${origin}/uploads/${objectKey}`,
        expiresAt,
        maxSizeBytes: policy.maxSizeBytes,
        contentType: dto.mimeType,
      };
    }

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      // Enforce the per-type size cap server-side via Content-Length-Range.
      // (Pre-signed PUTs only enforce headers signed in the URL.)
      ContentLength: undefined,
      Metadata: {
        'uploaded-by': userId,
        'file-type': dto.fileType,
      },
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, {
      expiresIn: this.presignTtlSeconds,
    });
    const expiresAt = new Date(Date.now() + this.presignTtlSeconds * 1000).toISOString();
    return {
      uploadUrl,
      objectKey,
      publicUrl: this.publicUrl(objectKey),
      expiresAt,
      maxSizeBytes: policy.maxSizeBytes,
      contentType: dto.mimeType,
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    // Validate first so directory-traversal attempts are rejected even when
    // the live S3 client isn't configured (dev-stub mode).
    if (!isSafeObjectKey(objectKey)) {
      throw new BadRequestException('Invalid objectKey');
    }
    if (!this.s3) {
      this.logger.log(`[storage-stub] DELETE ${objectKey}`);
      return;
    }
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch (err) {
      this.logger.error(`Failed to delete ${objectKey}: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Storage delete failed');
    }
  }

  /**
   * Dev-stub upload sink. Writes the raw bytes the client PUT to
   * `/storage/dev-upload/<objectKey>` to disk under `apps/backend/uploads/`.
   * Path-traversal is rejected via `isSafeObjectKey` before we touch the FS.
   */
  async saveDevUpload(objectKey: string, body: Buffer): Promise<void> {
    if (!isSafeObjectKey(objectKey)) {
      throw new BadRequestException('Invalid objectKey');
    }
    const filePath = join(DEV_UPLOADS_ROOT, objectKey);
    // Defence in depth: ensure the resolved path is inside the uploads root,
    // even though `isSafeObjectKey` already blocks `..` and absolute keys.
    if (!filePath.startsWith(DEV_UPLOADS_ROOT)) {
      throw new BadRequestException('Invalid objectKey');
    }
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    this.logger.log(`[storage-stub] PUT ${objectKey} (${body.length} bytes)`);
  }

  /** Returns the CDN-prefixed URL for an object key, or a default S3 URL. */
  publicUrl(objectKey: string): string {
    if (this.cloudfrontUrl) return `${this.cloudfrontUrl}/${objectKey}`;
    if (this.bucket) {
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${objectKey}`;
    }
    return `https://dev-stub.local/${objectKey}`;
  }
}

function isMimeAllowed(mime: string, allowed: string[]): boolean {
  return allowed.some((a) => (a.endsWith('/') ? mime.startsWith(a) : mime === a));
}

function sanitiseExtension(fileName: string | undefined, mimeType: string): string {
  if (fileName) {
    const ext = extname(fileName).toLowerCase();
    if (ext && /^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
  }
  // Fall back to a mime-derived extension
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/heic': '.heic',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'application/pdf': '.pdf',
    'model/gltf-binary': '.glb',
    'model/gltf+json': '.gltf',
  };
  return map[mimeType] ?? '';
}

function isSafeObjectKey(key: string): boolean {
  // Only allow simple alphanumeric paths under our known prefixes.
  if (key.includes('..') || key.startsWith('/')) return false;
  return /^[A-Za-z0-9_\-./]+$/.test(key) && key.length <= 1024;
}
