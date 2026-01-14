import { ThemeToggle } from '@/components/ui/theme-toggle';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo/logo.svg" alt="svg2ico logo" className="h-10 w-10" />
          <span className="text-2xl font-bold text-foreground">svg2ico</span>
        </a>
        <nav className="absolute left-1/2 -translate-x-1/2">
          <a href="#features" className="sr-only">
            Features
          </a>
          <a href="#how-it-works" className="sr-only">
            How It Works
          </a>
          <a href="#faq" className="sr-only">
            FAQ
          </a>
          <a
            href="https://buymeacoffee.com/cperuffo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-fit items-center gap-2 rounded-lg bg-[#5F7FFF] px-4 font-medium text-white transition-opacity hover:opacity-90"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <img src="/icons/coffee.svg" alt="Coffee cup icon" className="h-5 w-5" />
            <span>Buy me a coffee</span>
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/cperuffo3/svg2ico"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <FontAwesomeIcon icon={faGithub} className="text-xl" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
