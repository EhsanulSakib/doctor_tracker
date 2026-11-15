import type { Metadata } from "next";
import Image from "next/image";
import doctorPhoto from "@/assets/login-doctor.jpg";
import { BrandMark } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/login-form";
import { LoginShowcase } from "@/features/auth/login-showcase";
import { atLeast } from "@/lib/breakpoints";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Static page (no session read here): proxy.ts already sends signed-in visitors on to the app.
 * Photo panel from `lg`; on smaller screens only the form, with the wordmark above it.
 *
 * Photo: Vitaly Gariev (unsplash.com/@silverkblack), Unsplash License (free to use, no attribution
 * required). Stored as a 1280×1600 portrait crop so no pixels are wasted on a tall panel. next/image
 * serves AVIF / WebP sized to the viewport with a blurred placeholder; phones get a 16px variant.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh bg-surface lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      <aside className="relative hidden overflow-hidden bg-photo-scrim lg:block">
        <Image
          src={doctorPhoto}
          alt=""
          fill
          sizes={`${atLeast("xl")} 50vw, ${atLeast("lg")} 60vw, 1px`}
          placeholder="blur"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[35%_30%]"
        />
        {/* Deep indigo at the bottom for the text; the right edge fades into the form side's background. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-photo-scrim via-photo-scrim/80 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-photo-scrim/50 to-transparent" />
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-r from-transparent to-surface" />

        <div className="relative flex h-full flex-col justify-between p-10 text-on-photo xl:p-14">
          <div className="flex items-center gap-3">
            <BrandMark inverted />
            <span className="text-lg font-semibold tracking-tight">Doctor Tracker</span>
          </div>

          <LoginShowcase />
        </div>
      </aside>

      <section className="relative flex items-center justify-center overflow-hidden px-4 py-12 scrollbar-thin sm:px-6 lg:overflow-y-auto">
        {/* Soft accent glows behind the form. */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 size-80 rounded-full bg-accent-2/10 blur-3xl" />

        <div className="relative w-full max-w-md animate-rise rounded-panel border border-line bg-surface/80 p-6 shadow-overlay backdrop-blur-sm sm:p-8">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight text-ink">Doctor Tracker</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <LoginForm className="mt-8" />
        </div>
      </section>
    </main>
  );
}
