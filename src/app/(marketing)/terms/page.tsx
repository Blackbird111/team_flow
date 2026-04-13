import { generateSEO } from "@/lib/seo";

export const metadata = generateSEO({
  title: "Terms of Service",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="space-y-8 text-foreground/90">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using SaaSKit, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            SaaSKit provides a subscription-based service including AI chat, user dashboard,
            and related features. Features available to you depend on your subscription plan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Accounts</h2>
          <p className="text-muted-foreground leading-relaxed">
            You are responsible for maintaining the security of your account and password.
            You may not use another person&apos;s account without permission. You must notify us
            immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Subscriptions and Billing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Paid subscriptions are billed in advance on a monthly basis. You may cancel at
            any time — your subscription will remain active until the end of the current
            billing period. We do not offer refunds for partial months.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree not to use the service for any unlawful purpose, to generate harmful
            or illegal content, to attempt to bypass usage limits, or to reverse-engineer
            any part of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The service and its original content are the exclusive property of SaaSKit.
            Content you create using the service remains yours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            SaaSKit is provided &quot;as is&quot; without warranties of any kind. We shall not be
            liable for any indirect, incidental, or consequential damages arising from
            your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your account at any time for
            violation of these terms. You may delete your account at any time from
            your account settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about these Terms should be sent to{" "}
            <a
              href="mailto:your@email.com"
              className="text-violet-600 dark:text-violet-400 hover:underline"
            >
              your@email.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}