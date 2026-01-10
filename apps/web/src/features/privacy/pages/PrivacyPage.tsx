import { Footer, Header } from '../../home/components';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">Last updated: January 2026</p>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
            <p>
              svg2ico is designed with privacy in mind. We convert your SVG and PNG files to icon
              formats without storing your files or requiring an account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">What We Collect</h2>

            <h3 className="text-xl font-medium text-foreground">File Processing</h3>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Your uploaded files are processed <strong>in-memory only</strong>
              </li>
              <li>Files are never saved to disk or stored after conversion</li>
              <li>Converted files are sent directly to your browser and then discarded</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground">Anonymous Usage Metrics</h3>
            <p>We collect limited, anonymized data to improve the service:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Hashed IP address</strong> - A truncated SHA256 hash of your IP (not the
                actual IP) for rate limiting
              </li>
              <li>
                <strong>Conversion statistics</strong> - Input/output format, file sizes, processing
                time, success/failure status
              </li>
            </ul>
            <p>
              This data cannot be used to identify you or reconstruct your original files. We use it
              solely to monitor service health and prevent abuse.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">What We Don't Collect</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Your actual files or their contents</li>
              <li>Personal information (no accounts required)</li>
              <li>Cookies for tracking purposes</li>
              <li>Third-party analytics or advertising trackers</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Rate Limiting</h2>
            <p>
              To prevent abuse, we temporarily store a hashed version of your IP address to enforce
              rate limits. This data expires automatically and cannot be used to identify you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Data Retention</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Uploaded files</strong>: Deleted immediately after conversion (not stored)
              </li>
              <li>
                <strong>Rate limit data</strong>: Expires automatically within minutes
              </li>
              <li>
                <strong>Usage metrics</strong>: Retained for service analytics
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Third-Party Services</h2>
            <p>
              This service may be hosted on cloud infrastructure. No file data is shared with third
              parties. The hosting provider may collect standard server logs (IP addresses, request
              timestamps) as part of normal operations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be reflected on
              this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Contact</h2>
            <p>
              If you have questions about this privacy policy, you can reach out via the GitHub
              repository.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
