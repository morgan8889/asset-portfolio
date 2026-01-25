'use client';

/**
 * CSV File Upload Component
 *
 * Provides drag-and-drop and click-to-select file upload functionality
 * for CSV transaction imports.
 */

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CsvFileUploadProps {
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
}

export function CsvFileUpload({
  onFileSelect,
  onError,
  disabled = false,
  maxSizeMB = 10,
  className,
}: CsvFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return 'Please select a CSV file (.csv extension required)';
      }

      // Check MIME type (allow text/csv and application/vnd.ms-excel for Windows)
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
      if (!validTypes.includes(file.type) && file.type !== '') {
        return 'Invalid file type. Please select a CSV file.';
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      // Check for empty file
      if (file.size === 0) {
        return 'File is empty';
      }

      return null;
    },
    [maxSizeBytes, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        onError?.(validationError);
        return;
      }

      setError(null);
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect, onError]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedFile(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center w-full min-h-[200px] p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          error && 'border-destructive bg-destructive/5',
          selectedFile && !error && 'border-green-500 bg-green-500/5',
          !isDragging && !error && !selectedFile && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Choose CSV file"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="mt-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-destructive">
            <AlertCircle className="h-12 w-12" />
            <p className="text-sm text-center">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-foreground">
                {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Max file size: {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
