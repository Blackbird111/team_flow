import Link from "next/link";
import { Layers } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Client Portal", href: "/#features" },
    { label: "AI Features", href: "/#features" },
  ],
  Account: [
    { label: "Sign Up Free", href: "/register" },
    { label: "Log In", href: "/login" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold tracking-tight text-slate-900">
                Team<span className="text-blue-600">Flow</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Project management built for client work — not corporate chaos. Tasks, time tracking, and a client portal in one place.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-slate-900 mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} TeamFlow. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Built for digital agencies and freelance studios.
          </p>
        </div>
      </div>
    </footer>
  );
}
