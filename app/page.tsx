import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent))_0%,transparent_35%),radial-gradient(circle_at_80%_10%,hsl(var(--secondary))_0%,transparent_40%)]" />
      <section className="relative w-full max-w-2xl rounded-3xl border border-border/60 bg-card/85 p-10 text-center shadow-2xl shadow-black/10 backdrop-blur">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Realtime Messaging
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Realtime Chat</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Next.js App Router + Convex + Clerk + shadcn/ui.
        </p>

        <SignedIn>
          <Link
            href="/chat"
            className="mt-6 inline-flex rounded-lg border bg-foreground px-5 py-2 text-sm font-medium text-background shadow-sm transition hover:translate-y-[-1px] hover:opacity-95"
          >
            Open Chat
          </Link>
        </SignedIn>

        <SignedOut>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg border bg-background px-5 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:bg-accent"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg border bg-background px-5 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:bg-accent"
            >
              Sign Up
            </Link>
          </div>
        </SignedOut>
      </section>
    </main>
  );
}
