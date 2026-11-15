import type { Metadata } from "next";
import Image from "next/image";
import doctorPhoto from "@/assets/login-doctor.jpg";
import { BrandMark } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const FEATURES = [
  "Add and update doctor profiles",
  "Assign patients to doctors",
  "Search, filter and sort records",
  "See patient statistics on the dashboard",
] as const;

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
      <aside className="relative hidden overflow-hidden bg-[#1e1b4b] lg:block">
        <Image
          src={doctorPhoto}
          alt=""
          fill
          sizes="(min-width: 1280px) 50vw, (min-width: 1024px) 60vw, 1px"
          placeholder="blur"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[35%_30%]"
        />
        {/* Deep indigo at the bottom for the text; the right edge fades into the form side's background. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-[#1e1b4b] via-[#1e1b4b]/80 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-[#1e1b4b]/50 to-transparent" />
        <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-r from-transparent to-surface" />

        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <div className="flex items-center gap-3">
            <BrandMark inverted />
            <span className="text-lg font-semibold tracking-tight">Doctor Tracker</span>
          </div>

          <div className="max-w-md pb-2">
            <h2 className="text-3xl font-semibold tracking-tight">Doctor and patient management</h2>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-[15px] text-white/90 marker:text-white/60">
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-12 scrollbar-thin sm:px-6 lg:overflow-y-auto">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight text-ink">Doctor Tracker</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
          <LoginForm className="mt-8" />
        </div>
      </section>
    </main>
  );
}
