import { useTheme } from '@/hooks/useTheme';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <FontAwesomeIcon icon={faMoon} className="h-5 w-5" />
      ) : (
        <FontAwesomeIcon icon={faSun} className="h-5 w-5" />
      )}
    </Button>
  );
}
