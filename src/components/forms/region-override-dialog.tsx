'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Asset, Region } from '@/types/asset';
import { useAssetStore } from '@/lib/stores';
import { inferRegion } from '@/lib/utils/region-inference';
import { Globe2 } from 'lucide-react';

const formSchema = z.object({
  region: z.enum(['US', 'UK', 'EU', 'APAC', 'EMERGING', 'CA', 'OTHER']),
});

type FormValues = z.infer<typeof formSchema>;

interface RegionOverrideDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REGION_OPTIONS: { value: Region; label: string; description: string }[] =
  [
    {
      value: 'US',
      label: 'United States',
      description: 'US stocks and ETFs (NYSE, NASDAQ)',
    },
    { value: 'UK', label: 'United Kingdom', description: 'LSE, AIM' },
    {
      value: 'EU',
      label: 'European Union',
      description: 'Euronext, Deutsche Börse, etc.',
    },
    {
      value: 'APAC',
      label: 'Asia-Pacific',
      description: 'Japan, Australia, Hong Kong, etc.',
    },
    {
      value: 'EMERGING',
      label: 'Emerging Markets',
      description: 'Developing markets (BRICS, etc.)',
    },
    { value: 'CA', label: 'Canada', description: 'TSX, TSX-V' },
    { value: 'OTHER', label: 'Other', description: 'Other regions' },
  ];

export function RegionOverrideDialog({
  asset,
  open,
  onOpenChange,
}: RegionOverrideDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateAsset = useAssetStore((state) => state.updateAsset);

  // Get inferred region for comparison
  const inferredRegion = inferRegion(asset.symbol, asset.exchange);

  const [selectedRegion, setSelectedRegion] = useState<Region>(
    asset.region || inferredRegion || 'OTHER'
  );

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region: asset.region || inferredRegion || 'OTHER',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await updateAsset(asset.id, {
        region: values.region,
      });

      const regionLabel =
        REGION_OPTIONS.find((opt) => opt.value === values.region)?.label ||
        values.region;

      alert(
        `Region updated successfully: ${asset.symbol} region set to ${regionLabel}`
      );

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update region:', error);
      alert(
        `Failed to update region: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Geographic Region</DialogTitle>
          <DialogDescription>
            Override the automatically detected region for {asset.name} (
            {asset.symbol}). This is used for geographic diversification
            analysis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select
              value={selectedRegion}
              onValueChange={(value: Region) => {
                setSelectedRegion(value);
                setValue('region', value);
              }}
            >
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select the primary geographic region for this asset
            </p>
            {errors.region && (
              <p className="text-sm text-red-600">{errors.region.message}</p>
            )}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="mb-1 font-medium">Detection Info:</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-detected:</span>
              <span className="font-medium">
                {inferredRegion
                  ? REGION_OPTIONS.find((opt) => opt.value === inferredRegion)
                      ?.label || inferredRegion
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Setting:</span>
              <span className="font-medium">
                {asset.region
                  ? REGION_OPTIONS.find((opt) => opt.value === asset.region)
                      ?.label || asset.region
                  : 'Not set (using auto-detected)'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Region'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
