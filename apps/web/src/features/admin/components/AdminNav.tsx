import { Button } from '@/components/ui/button';
import {
  faChartLine,
  faChartPie,
  faCog,
  faExclamationTriangle,
  faGauge,
  faTachometerAlt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { AdminTab } from '../types';

interface AdminNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs: { id: AdminTab; label: string; icon: typeof faGauge }[] = [
  { id: 'overview', label: 'Overview', icon: faGauge },
  { id: 'conversions', label: 'Conversions', icon: faChartLine },
  { id: 'formats', label: 'Formats', icon: faChartPie },
  { id: 'performance', label: 'Performance', icon: faTachometerAlt },
  { id: 'configurations', label: 'Options', icon: faCog },
  { id: 'failures', label: 'Failures', icon: faExclamationTriangle },
];

export function AdminNav({ activeTab, onTabChange }: AdminNavProps) {
  return (
    <nav className="flex gap-2 border-b pb-4 mb-6">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onTabChange(tab.id)}
          className="gap-2"
        >
          <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}
