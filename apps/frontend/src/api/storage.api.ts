import { apiClient, unwrap } from './client';

export type StorageFileType =
  | 'image'
  | 'video'
  | 'document'
  | 'model_3d'
  | 'avatar'
  | 'agency_logo';

export type StorageFolder =
  | 'listings'
  | 'avatars'
  | 'agencies'
  | 'documents'
  | 'tours';

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  expiresAt: string;
  maxSizeBytes: number;
  contentType: string;
}

export const storageApi = {
  presign: async (
    fileType: StorageFileType,
    mimeType: string,
    folder: StorageFolder,
    fileName?: string,
  ): Promise<PresignedUrlResponse> => {
    const { data } = await apiClient.post<{ data: PresignedUrlResponse }>(
      '/storage/presigned-url',
      { fileType, mimeType, folder, fileName },
    );
    return unwrap<PresignedUrlResponse>(data);
  },

  remove: async (objectKey: string): Promise<void> => {
    await apiClient.delete('/storage/object', { data: { objectKey } });
  },

  /**
   * Uploads a File directly to S3 using a server-issued presigned URL.
   * Returns the eventual public CDN URL the backend should reference.
   */
  uploadFile: async (
    file: File,
    fileType: StorageFileType,
    folder: StorageFolder,
  ): Promise<{ publicUrl: string; objectKey: string }> => {
    const presigned = await storageApi.presign(fileType, file.type, folder, file.name);
    if (file.size > presigned.maxSizeBytes) {
      throw new Error(
        `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit for ${fileType} is ${(presigned.maxSizeBytes / 1024 / 1024).toFixed(0)} MB`,
      );
    }
    const res = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with HTTP ${res.status}`);
    }
    return { publicUrl: presigned.publicUrl, objectKey: presigned.objectKey };
  },
};
