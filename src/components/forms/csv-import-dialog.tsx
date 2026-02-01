'use client';

/**
 * CSV Import Dialog Component
 *
 * Main dialog orchestrating the CSV import flow:
 * 1. File selection
 * 2. Column mapping preview/edit
 * 3. Validation results
 * 4. Import confirmation
 * 5. Results summary
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CsvFileUpload } from './csv-file-upload';
import { ImportPreviewTable } from './import-preview-table';
import { ImportResults } from './import-results';
import {
  ColumnMappingEditor,
  hasAllRequiredMappings,
} from './column-mapping-editor';
import { DuplicateReview } from './duplicate-review';
import { useCsvImportStore } from '@/lib/stores/csv-import';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { ensureValidPortfolio } from '@/lib/utils/portfolio-validation';
import type { DuplicateHandling } from '@/types/csv-import';
import type { TransactionField } from '@/types/csv-import';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string | null;
}

type DialogStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'results';

export function CsvImportDialog({
  open,
  onOpenChange,
  portfolioId,
}: CsvImportDialogProps) {
  const {
    session,
    parseResult,
    isProcessing,
    progress,
    error,
    validationResult,
    startImport,
    confirmImport,
    cancelImport,
    downloadFailedRows,
    reset,
    updateColumnMapping,
    setDuplicateHandling,
    applyBrokeragePreset,
  } = useCsvImportStore();

  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
  } | null>(null);

  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [validatedPortfolioId, setValidatedPortfolioId] = useState<
    string | null
  >(null);
  const [portfolioAutoCreated, setPortfolioAutoCreated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { setCurrentPortfolio } = usePortfolioStore();

  const getCurrentStep = (): DialogStep => {
    if (importResult) return 'results';
    if (session?.status === 'importing') return 'importing';
    if (showMappingEditor) return 'mapping';
    if (session?.status === 'preview' || session?.status === 'mapping_review')
      return 'preview';
    return 'upload';
  };

  const currentStep = getCurrentStep();

  // Validate portfolio on dialog open
  useEffect(() => {
    let mounted = true;

    async function validatePortfolioOnOpen() {
      if (!open) {
        // Reset state when dialog closes
        setPortfolioAutoCreated(false);
        setValidatedPortfolioId(null);
        setIsValidating(false);
        return;
      }

      setIsValidating(true);

      try {
        const result = await ensureValidPortfolio(portfolioId);
        if (!mounted) return; // Prevent state update after unmount

        setValidatedPortfolioId(result.portfolioId);
        setPortfolioAutoCreated(result.wasCreated);
        setIsValidating(false);

        // Update store if portfolio was auto-created
        if (result.wasCreated) {
          setCurrentPortfolio(result.portfolio);
        }
      } catch (err) {
        if (!mounted) return; // Prevent state update after unmount

        console.error('Portfolio validation error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        useCsvImportStore.setState({
          error: `Failed to validate portfolio: ${errorMessage}`,
        });
        setIsValidating(false);
        // Still allow dialog to show with error message
      }
    }

    validatePortfolioOnOpen();
    return () => {
      mounted = false;
    };
  }, [open, portfolioId, setCurrentPortfolio]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!validatedPortfolioId) {
        useCsvImportStore.setState({
          error: 'Portfolio validation is still in progress. Please try again.',
        });
        return;
      }
      await startImport(file, validatedPortfolioId);
    },
    [startImport, validatedPortfolioId]
  );

  const handleConfirmImport = useCallback(async () => {
    try {
      const result = await confirmImport();
      setImportResult({
        success: result.success,
        importedCount: result.importedCount,
        skippedCount: result.skippedDuplicates ?? 0,
        errorCount: result.errorCount ?? 0,
      });
    } catch (err) {
      // Error is handled by the store
    }
  }, [confirmImport]);

  const handleClose = useCallback(() => {
    if (currentStep === 'importing') {
      // Don't close while importing
      return;
    }
    cancelImport();
    reset();
    setImportResult(null);
    onOpenChange(false);
  }, [currentStep, cancelImport, reset, onOpenChange]);

  const handleDone = useCallback(() => {
    reset();
    setImportResult(null);
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleMappingChange = useCallback(
    (index: number, field: TransactionField | null) => {
      updateColumnMapping(index, field);
    },
    [updateColumnMapping]
  );

  const handleEditMappings = useCallback(() => {
    setShowMappingEditor(true);
  }, []);

  const handleCloseMappingEditor = useCallback(() => {
    setShowMappingEditor(false);
  }, []);

  const handleDuplicateHandlingChange = useCallback(
    (handling: DuplicateHandling) => {
      setDuplicateHandling(handling);
    },
    [setDuplicateHandling]
  );

  const handleApplyBrokeragePreset = useCallback(
    (brokerageId: string) => {
      applyBrokeragePreset(brokerageId);
    },
    [applyBrokeragePreset]
  );

  const getDialogTitle = () => {
    switch (currentStep) {
      case 'upload':
        return 'Import Transactions from CSV';
      case 'preview':
        return 'Review Import Data';
      case 'mapping':
        return 'Edit Column Mappings';
      case 'importing':
        return 'Importing Transactions...';
      case 'results':
        return 'Import Complete';
      default:
        return 'Import CSV';
    }
  };

  const getDialogDescription = () => {
    switch (currentStep) {
      case 'upload':
        return 'Upload a CSV file containing your transaction history.';
      case 'preview':
        return 'Review the detected column mappings and data before importing.';
      case 'mapping':
        return 'Adjust how CSV columns map to transaction fields.';
      case 'importing':
        return 'Please wait while your transactions are being imported.';
      case 'results':
        return 'Your import has been processed.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Portfolio Auto-Created Notification */}
          {portfolioAutoCreated && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                No portfolio found. Created &quot;My Portfolio&quot; for your transactions.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step: Upload */}
          {currentStep === 'upload' && (
            <CsvFileUpload
              onFileSelect={handleFileSelect}
              disabled={isProcessing || isValidating || !validatedPortfolioId}
            />
          )}

          {/* Processing Indicator */}
          {isProcessing && currentStep === 'upload' && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Processing file...
              </span>
            </div>
          )}

          {/* Step: Preview */}
          {currentStep === 'preview' && session && validationResult && (
            <div className="space-y-4">
              {/* File Info and Brokerage Detection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{session.fileName}</span>
                  <span>•</span>
                  <span>{session.totalRows} rows</span>
                  {session.detectedBrokerage && (
                    <>
                      <span>•</span>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3" />
                        Detected: {session.detectedBrokerage.name}
                      </Badge>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditMappings}
                >
                  Edit Mapping
                </Button>
              </div>

              {/* Validation Summary */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {validationResult.validCount} valid
                  </span>
                </div>
                {validationResult.errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      {validationResult.errorCount} with errors
                    </span>
                  </div>
                )}
                {session.duplicateCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600">
                      {session.duplicateCount} potential duplicates
                    </span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <ImportPreviewTable
                rows={validationResult.valid.slice(0, 10)}
                mappings={session.columnMappings}
                maxRows={10}
              />

              {/* Duplicate Review */}
              {session.duplicateCount > 0 && (
                <DuplicateReview
                  duplicates={session.duplicates}
                  handling={session.duplicateHandling}
                  onHandlingChange={handleDuplicateHandlingChange}
                />
              )}

              {/* Missing Required Fields Warning */}
              {session.status === 'mapping_review' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Some required fields could not be automatically mapped.
                    Please review the column mappings.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step: Mapping Editor */}
          {currentStep === 'mapping' && session && parseResult && (
            <div className="space-y-4">
              <ColumnMappingEditor
                mappings={session.columnMappings}
                onMappingChange={handleMappingChange}
                sampleData={parseResult.rows[0]}
                detectedBrokerage={session.detectedBrokerage}
                onApplyBrokeragePreset={handleApplyBrokeragePreset}
              />
            </div>
          )}

          {/* Step: Importing */}
          {currentStep === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Importing transactions...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Step: Results */}
          {currentStep === 'results' && importResult && (
            <ImportResults
              success={importResult.success}
              importedCount={importResult.importedCount}
              skippedCount={importResult.skippedCount}
              errorCount={importResult.errorCount}
              onDownloadFailed={
                importResult.errorCount > 0 ? downloadFailedRows : undefined
              }
            />
          )}
        </div>

        <DialogFooter>
          {currentStep === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {currentStep === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={
                  isProcessing ||
                  !hasAllRequiredMappings(session?.columnMappings ?? []) ||
                  validationResult?.validCount === 0
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Import ${validationResult?.validCount ?? 0} Transactions`
                )}
              </Button>
            </>
          )}

          {currentStep === 'mapping' && (
            <>
              <Button variant="outline" onClick={handleCloseMappingEditor}>
                Back to Preview
              </Button>
              <Button
                onClick={handleCloseMappingEditor}
                disabled={
                  !hasAllRequiredMappings(session?.columnMappings ?? [])
                }
              >
                Apply Mappings
              </Button>
            </>
          )}

          {currentStep === 'results' && (
            <Button onClick={handleDone}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
