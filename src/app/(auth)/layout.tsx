import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    template: "%s | SaaS Starter",
    default: "Auth | SaaS Starter",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        >
          SaaS Starter
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} SaaS Starter. All rights reserved.
        </p>
      </footer>
    </div>
  );
}