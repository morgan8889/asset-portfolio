'use client';

import { usePathname } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { navigationStructure, type NavGroup } from '@/lib/config/navigation';
import { NavGroupComponent } from './nav-group';
import { NavItem } from './nav-item';

function isNavGroup(item: unknown): item is NavGroup {
  return (
    typeof item === 'object' &&
    item !== null &&
    'items' in item &&
    Array.isArray((item as NavGroup).items)
  );
}

function NavigationContent() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();

  return (
    <nav className="space-y-1 px-3">
      {navigationStructure.map((item) =>
        isNavGroup(item) ? (
          <NavGroupComponent
            key={item.id}
            group={item}
            sidebarOpen={sidebarOpen}
            currentPath={pathname}
          />
        ) : (
          <NavItem
            key={item.name}
            item={item}
            sidebarOpen={sidebarOpen}
            currentPath={pathname}
          />
        )
      )}
    </nav>
  );
}

export function Sidebar() {
  const { sidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <>
      {/* Desktop: Fixed Sidebar */}
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
            <NavigationContent />
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

      {/* Mobile: Sheet Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto py-4 pt-6">
              <NavigationContent />
            </div>

            <div className="border-t px-3 py-4">
              <div className="text-xs text-muted-foreground">
                <p>Portfolio Tracker v0.1.0</p>
                <p>Privacy-first investing</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
