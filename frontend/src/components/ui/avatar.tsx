import Image from "next/image";
import { cn } from "@/lib/utils";

/** "Dr. Nusrat Jahan" → "NJ" (a "Dr." title isn't an initial). */
export const avatarInitials = (name: string) =>
  name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

const TEXT: Record<number, string> = { 28: "text-xs", 32: "text-caption", 36: "text-xs", 40: "text-sm", 56: "text-lg", 88: "text-2xl", 96: "text-3xl" };

/**
 * A round photo, or the initials when there is none. Photos come from Cloudinary through next/image
 * (resized and served as AVIF / WebP). Decorative: the name always sits next to it.
 */
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent-fg",
        TEXT[size] ?? "text-xs",
        className,
      )}
    >
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" /> : avatarInitials(name)}
    </span>
  );
}
