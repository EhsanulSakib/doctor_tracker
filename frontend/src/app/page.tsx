// Placeholder until module 3.2 adds the login flow and app shell (then `/` redirects to /dashboard).
export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center">
        <p className="text-label font-medium uppercase text-ink-muted">Doctor Tracker</p>
        <h1 className="mt-2 text-title font-semibold">Admin portal</h1>
        <p className="mt-2 text-ink-muted">The sign-in page and app shell arrive in the next module.</p>
      </div>
    </main>
  );
}
