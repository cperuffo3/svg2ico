import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const footerLinks = {
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  connect: [{ label: 'GitHub', href: 'https://github.com' }],
};

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex justify-center gap-8">
          {/* Brand column */}
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo/logo.svg" alt="svg2ico logo" className="h-10 w-10" />
              <span className="text-xl font-bold text-foreground">svg2ico</span>
            </div>
            <p className="max-w-[288px] text-sm leading-5 text-muted-foreground">
              Convert SVG files to ICO and ICNS formats with complete privacy and lightning-fast
              speed.
            </p>
          </div>

          {/* Legal links */}
          <div className="flex flex-1 flex-col gap-4">
            <h4 className="text-base font-semibold text-foreground">Legal</h4>
            <div className="flex flex-col gap-2">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Connect links */}
          <div className="flex flex-1 flex-col gap-4">
            <h4 className="text-base font-semibold text-foreground">Connect</h4>
            <div className="flex flex-col gap-2">
              {footerLinks.connect.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            © 2026 Corey Peruffo. Made with care for developers and designers.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <FontAwesomeIcon icon={faGithub} className="text-xl" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
