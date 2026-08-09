import { useMutation } from '@tanstack/react-query';
import { apiUpload } from '@/features/shared/data/api';

/**
 * File uploads — `POST /api/upload/single` and `/multiple`, which store on
 * Cloudinary and hand back a URL.
 *
 * This is the missing step between the phone's image picker and every endpoint
 * that stores images. The picker yields an on-device path (`file:///…`); the
 * server's validators accept only `http(s)` URLs, because the image has to be
 * fetchable by anyone viewing the listing. Uploading first turns one into the
 * other.
 *
 * Mirrors `web/src/features/upload/data/uploadApi.ts`.
 */

export interface UploadedFile {
  url: string;
  publicId: string;
  originalName: string;
  size: number;
}

/**
 * A picked asset in the shape React Native's FormData expects.
 *
 * Note this is NOT a browser `File`/`Blob`. React Native serialises an object
 * of `{ uri, name, type }` into a multipart part by reading the file itself —
 * passing a Blob here would upload zero bytes.
 */
export interface PickedAsset {
  uri: string;
  name: string;
  type: string;
}

/** Best-effort mime type from the file extension the picker gave us. */
function guessMime(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/** Turns an ImagePicker asset into the multipart shape, filling in the gaps. */
export function toPickedAsset(uri: string, index = 0): PickedAsset {
  return {
    uri,
    // The server keeps `originalName`, so a real extension matters.
    name: uri.split('/').pop() || `photo-${index}.jpg`,
    type: guessMime(uri),
  };
}

export function useUploadFile() {
  return useMutation({
    mutationFn: (asset: PickedAsset) => {
      const form = new FormData();
      // `file` is the field name multer expects — see upload.router.ts.
      form.append('file', asset as unknown as Blob);
      return apiUpload<UploadedFile>('/api/upload/single', form);
    },
  });
}

/** Up to 5 per request, which is multer's configured limit. */
export function useUploadFiles() {
  return useMutation({
    mutationFn: (assets: PickedAsset[]) => {
      const form = new FormData();
      assets.forEach((a) => form.append('files', a as unknown as Blob));
      return apiUpload<{ files: UploadedFile[] }>('/api/upload/multiple', form).then((r) => r.files);
    },
  });
}
