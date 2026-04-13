"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Layers, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/auth/user-button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        scrolled
          ? "bg-white border-b border-slate-200 shadow-sm"
          : "bg-white/80 backdrop-blur-md border-b border-slate-100"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15" style={{ height: 60 }}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Layers className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Team<span className="text-blue-600">Flow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {status === "loading" ? (
              <div className="w-20 h-8 rounded-md bg-slate-100 animate-pulse" />
            ) : session ? (
              <>
                <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <UserButton />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  asChild
                >
                  <Link href="/register">Get started free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-lg">
          <div className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-1 border-t border-slate-100 flex flex-col gap-2">
              {status === "loading" ? (
                <div className="h-9 rounded-md bg-slate-100 animate-pulse" />
              ) : session ? (
                <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>Get started free</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
