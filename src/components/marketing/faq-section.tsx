import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    q: "What do I get exactly?",
    a: "A complete Next.js 16 codebase with auth (email, Google OAuth, magic links, password reset), Stripe subscriptions with 4 tiers, AI chat with streaming and usage limits, full dashboard, blog with MDX, SEO utilities, and comprehensive documentation. One purchase — full source code, lifetime access.",
  },
  {
    q: "What tech stack does it use?",
    a: "Next.js 16 with App Router and Turbopack, TypeScript strict mode, Prisma 7 with PostgreSQL (Neon), NextAuth v5, Stripe, OpenAI, shadcn/ui, Tailwind CSS, Framer Motion, and Resend for emails.",
  },
  {
    q: "Do I need to know React and Next.js?",
    a: "Yes — this is a developer-focused template. You should be comfortable with React and Next.js. The codebase follows modern patterns and is well-documented, but it is not a no-code solution.",
  },
  {
    q: "Can I use it for multiple projects?",
    a: "Yes. One purchase gives you lifetime access to use the template across unlimited personal and commercial projects.",
  },
  {
    q: "Can I swap out libraries (e.g. different email provider)?",
    a: "Absolutely. The integrations are modular. You can swap Resend for Sendgrid, use a different AI provider, or replace any service — the architecture is designed for that.",
  },
  {
    q: "Is PostgreSQL required or can I use something else?",
    a: "The template is built with Prisma, which supports PostgreSQL, MySQL, SQLite, and more. Switching databases requires only a schema change and updating the connection string.",
  },
  {
    q: "Will I get updates?",
    a: "Yes — lifetime updates are included. As the stack evolves (Next.js versions, dependency updates, new features), the template gets updated too.",
  },
  {
    q: "Is there support if I get stuck?",
    a: "Yes — reach out via email. The documentation covers setup, configuration, and common issues in detail.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-3">FAQ</Badge>
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Have another question?{" "}
            <a
              href="mailto:your@email.com"
              className="text-violet-600 dark:text-violet-400 hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
          {faqs.map((faq) => (
            <details key={faq.q} className="group px-6">
              <summary className="flex items-center justify-between py-4 text-sm font-medium cursor-pointer list-none gap-4">
                <span>{faq.q}</span>
                {/* chevron via CSS rotate */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}