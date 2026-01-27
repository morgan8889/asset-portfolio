'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  Clock,
  FlaskConical,
  Home,
  PieChart,
  Settings,
  TrendingUp,
  Wallet,
  FileText,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'Holdings',
    href: '/holdings',
    icon: Briefcase,
    badge: 'coming-soon' as const,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: Wallet,
  },
  {
    name: 'Analysis',
    href: '/analysis',
    icon: BarChart3,
    badge: 'coming-soon' as const,
  },
  {
    name: 'Performance',
    href: '/performance',
    icon: TrendingUp,
  },
  {
    name: 'Allocation',
    href: '/allocation',
    icon: PieChart,
    badge: 'beta' as const,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    badge: 'coming-soon' as const,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();

  return (
    <div
      className={cn(
        'fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300 ease-in-out',
        // Hide on mobile, show on desktop (md breakpoint = 768px)
        'hidden md:block',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href as any}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      !sidebarOpen && 'px-2'
                    )}
                  >
                    <item.icon
                      className={cn('h-4 w-4', sidebarOpen && 'mr-2')}
                    />
                    {sidebarOpen && (
                      <>
                        <span className="truncate">{item.name}</span>
                        {item.badge === 'beta' && (
                          <Badge variant="beta" className="ml-auto">
                            <FlaskConical className="mr-1 h-3 w-3 text-amber-700 dark:text-amber-400" />
                            Beta
                          </Badge>
                        )}
                        {item.badge === 'coming-soon' && (
                          <Badge variant="comingSoon" className="ml-auto">
                            <Clock className="mr-1 h-3 w-3 text-gray-500 dark:text-gray-400" />
                            Coming Soon
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {sidebarOpen && (
          <div className="border-t px-3 py-4">
            <div className="text-xs text-muted-foreground">
              <p>Portfolio Tracker v0.1.0</p>
              <p>Privacy-first investing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
