'use client';

/**
 * Document Upload Component
 * Allows users to upload PDF, TXT, and MD files for RAG processing
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Uploaded document information
 */
interface UploadedDocument {
  id: string;
  filename: string;
  fileSize: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  chunkCount?: number;
  processedAt?: Date;
}

/**
 * Upload response from API
 */
interface UploadResponse {
  success: boolean;
  documentId: string;
  filename: string;
  chunkCount: number;
  error?: string;
}

/**
 * Supported file extensions
 */
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  return { valid: true };
}

/**
 * Document Upload Component
 */
export function DocumentUpload() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Upload a single file to the API
   */
  const uploadFile = useCallback(async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  }, []);

  /**
   * Handle file selection
   */
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate and prepare documents
    const newDocuments: UploadedDocument[] = fileArray.map((file) => {
      const validation = validateFile(file);

      return {
        id: `${Date.now()}_${file.name}`,
        filename: file.name,
        fileSize: file.size,
        status: validation.valid ? 'uploading' : 'error',
        error: validation.error,
      };
    });

    // Add documents to state
    setDocuments((prev) => [...newDocuments, ...prev]);

    // Upload valid files
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const doc = newDocuments[i];

      if (doc.status === 'error') continue;

      try {
        // Update status to processing
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, status: 'processing' } : d
          )
        );

        // Upload file
        const result = await uploadFile(file);

        // Update status to success
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'success',
                  chunkCount: result.chunkCount,
                  processedAt: new Date(),
                }
              : d
          )
        );
      } catch (error) {
        // Update status to error
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : d
          )
        );
      }
    }
  }, [uploadFile]);

  /**
   * Handle drag and drop events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  }, [handleFiles]);

  /**
   * Remove a document from the list
   */
  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  /**
   * Trigger file input click
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
        <CardDescription>
          Upload documents (PDF, TXT, MD) to enhance AI responses with your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
            }
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md"
            onChange={handleInputChange}
            className="hidden"
          />

          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: PDF, TXT, MD (max {formatFileSize(MAX_FILE_SIZE)})
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={(e) => {
              e.stopPropagation();
              handleUploadClick();
            }}
          >
            Select Files
          </Button>
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Uploaded Documents</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-white"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <File className="h-5 w-5 text-gray-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)}
                        {doc.chunkCount && ` • ${doc.chunkCount} chunks`}
                      </p>
                      {doc.error && (
                        <p className="text-xs text-red-500 mt-1">{doc.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Status Badge */}
                    {doc.status === 'uploading' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading
                      </Badge>
                    )}
                    {doc.status === 'processing' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {doc.status === 'success' && (
                      <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                      </Badge>
                    )}
                    {doc.status === 'error' && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {documents.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <span>
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </span>
            <span>
              {documents.filter((d) => d.status === 'success').length} ready
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
