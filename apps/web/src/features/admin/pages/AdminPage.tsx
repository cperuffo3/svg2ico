import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { faArrowLeft, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminLogin,
  AdminNav,
  ConfigurationsDashboard,
  ConversionsDashboard,
  FailuresDashboard,
  FormatsDashboard,
  OverviewDashboard,
  PerformanceDashboard,
} from '../components';
import { useAdminAuth } from '../hooks';
import type { AdminTab } from '../types';

export function AdminPage() {
  const { password, isAuthenticated, setPassword, clearPassword } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loginError, setLoginError] = useState<string>();

  const handleLogin = (pwd: string) => {
    setLoginError(undefined);
    setPassword(pwd);
  };

  const handleAuthError = () => {
    setLoginError('Invalid password');
    clearPassword();
  };

  // Clear login error when successfully authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoginError(undefined);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={clearPassword} className="gap-2">
              <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <AdminNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <OverviewDashboard password={password!} onAuthError={handleAuthError} />
        )}
        {activeTab === 'conversions' && (
          <ConversionsDashboard password={password!} onAuthError={handleAuthError} />
        )}
        {activeTab === 'formats' && (
          <FormatsDashboard password={password!} onAuthError={handleAuthError} />
        )}
        {activeTab === 'performance' && (
          <PerformanceDashboard password={password!} onAuthError={handleAuthError} />
        )}
        {activeTab === 'configurations' && (
          <ConfigurationsDashboard password={password!} onAuthError={handleAuthError} />
        )}
        {activeTab === 'failures' && (
          <FailuresDashboard password={password!} onAuthError={handleAuthError} />
        )}
      </main>
    </div>
  );
}
