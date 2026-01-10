import { Footer, Header } from '../../home/components';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Service</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">Last updated: January 2026</p>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Acceptance of Terms</h2>
            <p>
              By accessing and using svg2ico, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Description of Service</h2>
            <p>
              svg2ico is a free online tool that converts SVG and PNG files to icon formats (ICO,
              ICNS, PNG). The service processes files in your browser and on our servers without
              permanently storing them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Acceptable Use</h2>
            <p>You agree to use this service only for lawful purposes. You may not:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Upload files containing malware, viruses, or malicious code</li>
              <li>Attempt to overload, disrupt, or attack the service</li>
              <li>Use automated tools to make excessive requests (rate limits apply)</li>
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to reverse-engineer or compromise the service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Intellectual Property</h2>
            <p>
              You retain all rights to the files you upload. We do not claim any ownership of your
              content. You are responsible for ensuring you have the right to use and convert any
              files you upload.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Service Availability</h2>
            <p>
              We strive to keep svg2ico available, but we do not guarantee uninterrupted access. The
              service may be temporarily unavailable for maintenance, updates, or due to
              circumstances beyond our control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Disclaimer of Warranties</h2>
            <p>
              The service is provided "as is" without warranties of any kind, express or implied. We
              do not guarantee that:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>The service will meet your specific requirements</li>
              <li>Conversions will be error-free or produce specific results</li>
              <li>The service will be available at all times</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              service, including but not limited to loss of data or profits.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Rate Limiting</h2>
            <p>
              To ensure fair access for all users, we implement rate limiting. Excessive use may
              result in temporary restrictions. If you need higher limits, please contact us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be posted on this
              page with an updated revision date. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Contact</h2>
            <p>
              If you have questions about these terms, you can reach out via the GitHub repository.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
