/**
 * Full-page outage screen shown by ServiceStatusProvider when the API is down.
 */
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { faRotate, faServer } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ServiceUnavailablePageProps {
  onRetry: () => void;
  isChecking: boolean;
}

export function ServiceUnavailablePage({ onRetry, isChecking }: ServiceUnavailablePageProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg overflow-hidden text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <FontAwesomeIcon icon={faServer} className="text-6xl text-destructive" />
          </div>
          <CardTitle className="text-2xl">We're experiencing problems</CardTitle>
          <CardDescription className="text-base">
            svg2ico is temporarily unavailable. We're working on it and conversions will be back
            shortly. This page will reload automatically once service is restored.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={onRetry} disabled={isChecking} className="gap-2">
            <FontAwesomeIcon icon={faRotate} className="h-4 w-4" spin={isChecking} />
            {isChecking ? 'Checking…' : 'Try Again'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
