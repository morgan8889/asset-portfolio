'use client';

import Link from 'next/link';
import { Clock, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavItem as NavItemType } from '@/lib/config/navigation';

interface NavItemProps {
  item: NavItemType;
  sidebarOpen: boolean;
  currentPath: string;
}

export function NavItem({ item, sidebarOpen, currentPath }: NavItemProps) {
  const isActive = currentPath === item.href;

  return (
    <Link href={item.href}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start', !sidebarOpen && 'px-2')}
      >
        <item.icon className={cn('h-4 w-4', sidebarOpen && 'mr-2')} />
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
}
