import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  faCircleCheck,
  faCircleXmark,
  faDatabase,
  faHeartPulse,
  faRotate,
  faServer,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useHealth } from '../hooks';

export function HealthStatusCard() {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useHealth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faHeartPulse} className="h-5 w-5" />
          <CardTitle>API Health Status</CardTitle>
        </div>
        <CardDescription>Real-time health check from the backend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <FontAwesomeIcon
              icon={faRotate}
              className="h-8 w-8 animate-spin text-muted-foreground"
            />
          </div>
        )}

        {isError && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8" />
              <span className="font-medium">Connection Failed</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Make sure the API is running on port 3000
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {data.status === 'ok' ? (
                <>
                  <FontAwesomeIcon icon={faCircleCheck} className="h-8 w-8 text-green-500" />
                  <Badge variant="success" className="text-base px-4 py-1">
                    Healthy
                  </Badge>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8 text-destructive" />
                  <Badge variant="destructive" className="text-base px-4 py-1">
                    Unhealthy
                  </Badge>
                </>
              )}
            </div>

            {data.info && Object.keys(data.info).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Services</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(data.info).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {key === 'database' ? (
                          <FontAwesomeIcon
                            icon={faDatabase}
                            className="h-4 w-4 text-muted-foreground"
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faServer}
                            className="h-4 w-4 text-muted-foreground"
                          />
                        )}
                        <span className="capitalize">{key}</span>
                      </div>
                      <Badge variant={value.status === 'up' ? 'success' : 'destructive'}>
                        {value.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dataUpdatedAt && (
              <p className="text-center text-xs text-muted-foreground">
                Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
