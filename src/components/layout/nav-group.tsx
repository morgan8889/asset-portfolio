'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/lib/config/navigation';
import { NavItem } from './nav-item';

interface NavGroupProps {
  group: NavGroup;
  sidebarOpen: boolean;
  currentPath: string;
}

export function NavGroupComponent({
  group,
  sidebarOpen,
  currentPath,
}: NavGroupProps) {
  // Auto-expand if any child is active
  const hasActiveChild = group.items.some((item) => item.href === currentPath);
  const [isOpen, setIsOpen] = useState(group.defaultOpen || hasActiveChild);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start',
            !sidebarOpen && 'px-2',
            hasActiveChild && 'bg-secondary/50'
          )}
        >
          <group.icon className={cn('h-4 w-4', sidebarOpen && 'mr-2')} />
          {sidebarOpen && (
            <>
              <span className="flex-1 truncate text-left">{group.name}</span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
            </>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 pt-1">
        {group.items.map((item) => (
          <div key={item.name} className={cn(sidebarOpen && 'pl-6')}>
            <NavItem
              item={item}
              sidebarOpen={sidebarOpen}
              currentPath={currentPath}
            />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
