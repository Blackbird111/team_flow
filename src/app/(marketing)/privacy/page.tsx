import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Privacy Policy",
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            We collect information you provide directly to us, such as when you create an account,
            subscribe to a plan, or contact us for support. This may include your name, email address,
            and payment information (processed securely by Stripe — we never store card details).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use the information we collect to provide, maintain, and improve our services,
            process transactions, send transactional emails (password resets, receipts), and
            respond to your requests. We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Data Storage</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your data is stored on secure servers. We use Neon PostgreSQL for database storage
            and industry-standard encryption for data in transit and at rest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use the following third-party services: Stripe (payment processing),
            Resend (transactional email), and OpenAI (AI features). Each of these services
            has its own privacy policy governing the use of your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use cookies solely for authentication (session management). We do not use
            tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request access to, correction of, or deletion of your personal data at
            any time by contacting us at{" "}
            <a href="mailto:your@email.com" className="text-violet-600 dark:text-violet-400 hover:underline">
              your@email.com
            </a>
            . We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:your@email.com" className="text-violet-600 dark:text-violet-400 hover:underline">
              your@email.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}