import { ThemeToggle } from '@/components/ui/theme-toggle';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-3 items-center px-6 py-4">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-gradient-primary-from to-gradient-primary-to">
            <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">svg2ico</span>
        </a>
        <a
          href="https://buymeacoffee.com/cperuffo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-fit items-center gap-2 justify-self-center rounded-lg bg-[#5F7FFF] px-4 font-medium text-white transition-opacity hover:opacity-90"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt=""
            className="h-5 w-5"
          />
          <span>Buy me a coffee</span>
        </a>
        <div className="flex items-center gap-2 justify-self-end">
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
