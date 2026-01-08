import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { faBook } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { HealthStatusCard } from '../components';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Svg2ico</h1>
            <p className="text-muted-foreground text-lg">
              NestJS + Vite + Turborepo + Tailwind v4 + shadcn/ui + Prisma
            </p>
          </div>

          <HealthStatusCard />

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              Frontend: <code className="bg-muted px-1 rounded">http://localhost:5173</code>
            </p>
            <p>
              Backend: <code className="bg-muted px-1 rounded">http://localhost:3000/api/v1</code>
            </p>
          </div>

          <Link to="/api-docs">
            <Button variant="outline" className="gap-2">
              <FontAwesomeIcon icon={faBook} className="h-4 w-4" />
              API Documentation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
