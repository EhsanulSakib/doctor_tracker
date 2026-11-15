import { clientFetch } from "./client-fetch";
import { ApiError } from "./errors";
import type { ApiData } from "./types";

export type UploadKind = "avatar" | "doctor";

type UploadSignature = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Uploads an image straight to Cloudinary with a one-time signature from our API (the file never passes
 * through our server) and returns its HTTPS URL, ready to save on a doctor or the profile.
 * Throws `ApiError`: the demo account's 403 comes from the signature request (and shows as a toast).
 */
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ApiError(400, "INVALID_FILE", "Choose a JPG, PNG, WebP or GIF image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "FILE_TOO_LARGE", "The image is larger than 5 MB.");
  }

  const { data: sig } = await clientFetch<ApiData<UploadSignature>>("/uploads/signature", { method: "POST", body: { kind } });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: form });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the image service. Check your connection and try again.");
  }

  const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.secure_url) {
    throw new ApiError(res.status, "UPLOAD_FAILED", body?.error?.message ?? "The image couldn't be uploaded. Please try again.");
  }
  return body.secure_url;
}
