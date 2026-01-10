import { useCallback, useState } from 'react';

const STORAGE_KEY = 'admin-password';

export function useAdminAuth() {
  const [password, setPasswordState] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY);
  });

  const setPassword = useCallback((pwd: string) => {
    sessionStorage.setItem(STORAGE_KEY, pwd);
    setPasswordState(pwd);
  }, []);

  const clearPassword = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPasswordState(null);
  }, []);

  const isAuthenticated = password !== null;

  return {
    password,
    isAuthenticated,
    setPassword,
    clearPassword,
  };
}
