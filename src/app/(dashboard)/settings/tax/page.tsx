import { TaxSettingsPanel } from '@/components/settings/tax-settings-panel';

export const metadata = {
  title: 'Tax Settings - Portfolio Tracker',
  description: 'Configure capital gains tax rates for tax liability estimation',
};

export default function TaxSettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tax Settings</h1>
        <p className="text-muted-foreground">
          Configure your capital gains tax rates for accurate tax liability calculations
        </p>
      </div>

      <TaxSettingsPanel />
    </div>
  );
}
