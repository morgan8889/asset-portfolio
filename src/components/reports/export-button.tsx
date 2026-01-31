'use client';

/**
 * Reusable export button with progress indicator
 * @feature 011-export-functionality
 */

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useExportStore } from '@/lib/stores/export';

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportButton({
  onClick,
  disabled,
  children,
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const { progress } = useExportStore();
  const isExporting = progress.status === 'preparing' || progress.status === 'generating';

  return (
    <Button
      variant={variant}
      size={size}
      className="w-full"
      onClick={onClick}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {progress.message || 'Exporting...'}
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {children}
        </>
      )}
    </Button>
  );
}
