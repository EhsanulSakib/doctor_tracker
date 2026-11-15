"use client";

import { AnimatePresence, m } from "motion/react";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import { ACCEPTED_IMAGE_TYPES, uploadImage, type UploadKind } from "@/lib/api/upload";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Spinner } from "./spinner";

type ImageUploadProps = {
  /** Name for the initials when there is no photo. */
  name: string;
  value: string | null;
  onChange: (url: string | null) => void | Promise<void>;
  kind: UploadKind;
  size?: number;
  disabled?: boolean;
  className?: string;
};

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

/**
 * Optional photo picker: the avatar with a camera button, plus "Upload" / "Remove". The file goes straight
 * to Cloudinary (lib/api/upload.ts); `onChange` receives the resulting URL, or null on remove.
 */
export function ImageUpload({ name, value, onChange, kind, size = 72, disabled, className }: ImageUploadProps) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => input.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onChange(await uploadImage(file, kind));
    } catch (error) {
      if (!isApiError(error)) throw error;
      if (!isReadOnlyError(error)) toast.error("Couldn't upload the photo", error.message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={pick}
        disabled={disabled || uploading}
        aria-label={value ? "Change photo" : "Upload photo"}
        className="group relative shrink-0 rounded-full focus-ring disabled:cursor-not-allowed"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={value ?? "initials"}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            className="block"
          >
            <Avatar name={name || "?"} src={value} size={size} />
          </m.span>
        </AnimatePresence>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-overlay text-white transition-opacity",
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          {uploading ? <Spinner size={18} /> : <CameraIcon />}
        </span>
      </button>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={pick} disabled={disabled || uploading}>
            {uploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled || uploading}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-caption text-ink-subtle">JPG, PNG, WebP or GIF · max 5 MB</p>
      </div>

      <input ref={input} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
