import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Roadmap', href: '#roadmap' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
  connect: [
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Twitter', href: 'https://twitter.com' },
    { label: 'Contact', href: '/contact' },
  ],
};

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex justify-center gap-8">
          {/* Brand column */}
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-gradient-primary-from to-gradient-primary-to">
                <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">svg2ico</span>
            </div>
            <p className="max-w-[288px] text-sm leading-5 text-slate-500">
              Convert SVG files to ICO and ICNS formats with complete privacy and lightning-fast
              speed.
            </p>
          </div>

          {/* Product links */}
          <div className="flex flex-1 flex-col gap-4">
            <h4 className="text-base font-semibold text-slate-900">Product</h4>
            <div className="flex flex-col gap-2">
              {footerLinks.product.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Legal links */}
          <div className="flex flex-1 flex-col gap-4">
            <h4 className="text-base font-semibold text-slate-900">Legal</h4>
            <div className="flex flex-col gap-2">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Connect links */}
          <div className="flex flex-1 flex-col gap-4">
            <h4 className="text-base font-semibold text-slate-900">Connect</h4>
            <div className="flex flex-col gap-2">
              {footerLinks.connect.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-8">
          <p className="text-sm text-slate-500">
            © 2024 svg2ico. Made with care for developers and designers.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 transition-colors hover:text-slate-700"
            >
              <FontAwesomeIcon icon={faGithub} className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 transition-colors hover:text-slate-700"
            >
              <FontAwesomeIcon icon={faTwitter} className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
