import { createContext, useContext } from 'react';

export interface ServiceStatusContextValue {
  /** True once the health check has failed (after retries). */
  isDown: boolean;
  /**
   * Call when an API request failed in a way that suggests an outage
   * (network error, timeout, 5xx). Triggers an immediate health re-check;
   * the outage screen appears only if that check also fails.
   */
  reportPossibleOutage: () => void;
}

export const ServiceStatusContext = createContext<ServiceStatusContextValue>({
  isDown: false,
  reportPossibleOutage: () => {},
});

export function useServiceStatus(): ServiceStatusContextValue {
  return useContext(ServiceStatusContext);
}
