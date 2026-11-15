import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="max-w-md animate-rise text-center">
        <BrandMark className="mx-auto" />
        <p className="mt-8 font-mono text-sm text-accent-fg">404</p>
        <h1 className="mt-2 text-title font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">This page doesn&apos;t exist.</p>
        <Link href="/dashboard" className={buttonStyles({ className: "mt-8" })}>
          Go to the dashboard
        </Link>
      </div>
    </main>
  );
}
