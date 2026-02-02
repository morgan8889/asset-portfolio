import {
  Home,
  Briefcase,
  Wallet,
  PieChart,
  BarChart3,
  TrendingUp,
  FileText,
  Settings,
  Receipt,
  Target,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href:
    | '/'
    | '/holdings'
    | '/transactions'
    | '/analysis'
    | '/performance'
    | '/allocation'
    | '/planning'
    | '/reports'
    | '/settings'
    | '/tax-analysis'
    | '/settings/tax';
  icon: typeof Home;
  badge?: 'beta' | 'coming-soon';
}

export interface NavGroup {
  id: string;
  name: string;
  icon: typeof Home;
  items: NavItem[];
  defaultOpen?: boolean;
}

export const navigationStructure: (NavItem | NavGroup)[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    icon: Briefcase,
    defaultOpen: true,
    items: [
      { name: 'Holdings', href: '/holdings', icon: Briefcase },
      { name: 'Transactions', href: '/transactions', icon: Wallet },
      { name: 'Allocation', href: '/allocation', icon: PieChart },
    ],
  },
  {
    id: 'analysis',
    name: 'Analysis & Planning',
    icon: BarChart3,
    defaultOpen: true,
    items: [
      { name: 'Analysis', href: '/analysis', icon: BarChart3 },
      { name: 'Performance', href: '/performance', icon: TrendingUp },
      { name: 'Tax Analysis', href: '/tax-analysis', icon: Receipt },
      { name: 'Planning', href: '/planning', icon: Target },
    ],
  },
  {
    id: 'reports-settings',
    name: 'Reports & Settings',
    icon: FileText,
    defaultOpen: false,
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Tax Settings', href: '/settings/tax', icon: Receipt },
    ],
  },
];
