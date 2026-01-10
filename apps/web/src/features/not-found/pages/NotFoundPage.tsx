import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { faHouse, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <FontAwesomeIcon icon={faSearch} className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-6xl font-bold text-primary">404</CardTitle>
          <CardTitle className="mt-2 text-2xl">Page Not Found</CardTitle>
          <CardDescription className="text-base">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>

        <CardFooter className="justify-center gap-3">
          <Button onClick={() => navigate('/')} className="gap-2">
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
