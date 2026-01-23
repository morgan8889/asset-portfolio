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

import { useState, useCallback } from 'react';
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
import { Loader2, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { CsvFileUpload } from './csv-file-upload';
import { ImportPreviewTable } from './import-preview-table';
import { ImportResults } from './import-results';
import { useCsvImportStore } from '@/lib/stores/csv-import';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
}

type DialogStep = 'upload' | 'preview' | 'importing' | 'results';

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
  } = useCsvImportStore();

  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
  } | null>(null);

  const getCurrentStep = (): DialogStep => {
    if (importResult) return 'results';
    if (session?.status === 'importing') return 'importing';
    if (session?.status === 'preview' || session?.status === 'mapping_review') return 'preview';
    return 'upload';
  };

  const currentStep = getCurrentStep();

  const handleFileSelect = useCallback(
    async (file: File) => {
      await startImport(file, portfolioId);
    },
    [startImport, portfolioId]
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

  const getDialogTitle = () => {
    switch (currentStep) {
      case 'upload':
        return 'Import Transactions from CSV';
      case 'preview':
        return 'Review Import Data';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
              disabled={isProcessing}
            />
          )}

          {/* Processing Indicator */}
          {isProcessing && currentStep === 'upload' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Processing file...</span>
            </div>
          )}

          {/* Step: Preview */}
          {currentStep === 'preview' && session && validationResult && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{session.fileName}</span>
                <span>•</span>
                <span>{session.totalRows} rows</span>
              </div>

              {/* Validation Summary */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{validationResult.validCount} valid</span>
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

          {/* Step: Importing */}
          {currentStep === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Importing transactions...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
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
                  session?.status === 'mapping_review' ||
                  validationResult?.validCount === 0
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Import ${validationResult?.validCount ?? 0} Transactions`
                )}
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
