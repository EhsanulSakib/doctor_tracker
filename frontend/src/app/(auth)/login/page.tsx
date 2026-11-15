import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  ["Find anyone fast", "Search doctors and patients by name, phone or email."],
  ["Every patient placed", "Each patient belongs to one doctor; reassign in a click."],
  ["Trends at a glance", "Admissions, conditions and caseloads on one dashboard."],
] as const;

/**
 * Static page (no session read here): proxy.ts already sends signed-in visitors on to the app.
 * Brand panel from `lg`; on smaller screens only the form, with the wordmark above it.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-accent text-accent-ink lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden className="ledger-lines pointer-events-none absolute inset-0" />

        <div className="relative flex items-center gap-3">
          <BrandMark inverted />
          <span className="text-lg font-semibold tracking-tight">Doctor Tracker</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-label font-medium uppercase opacity-80">Clinic administration</p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-tight">Every doctor, every patient, one ledger.</h2>
          <p className="mt-4 text-[15px] leading-relaxed opacity-85">
            Manage doctors across your hospitals in Bangladesh, keep every patient with the right doctor, and watch admissions
            trend over time.
          </p>
          <dl className="mt-10 grid gap-5 border-t border-current/20 pt-6">
            {HIGHLIGHTS.map(([title, text]) => (
              <div key={title}>
                <dt className="text-sm font-semibold">{title}</dt>
                <dd className="mt-0.5 text-sm opacity-80">{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs opacity-75">Dhaka · Chattogram · Sylhet · Rajshahi · Khulna</p>
      </aside>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight">Doctor Tracker</span>
          </div>
          <h1 className="text-title font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Use your administrator account to continue.</p>
          <LoginForm className="mt-8" />
          <p className="mt-8 text-xs leading-relaxed text-ink-subtle">
            Authorised staff only. A session lasts 7 days from your last visit, or until you sign out.
          </p>
        </div>
      </section>
    </main>
  );
}
