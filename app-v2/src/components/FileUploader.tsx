/**
 * File Uploader Component
 *
 * Mobile-first file upload component using backend service account.
 * Matches app-v2 design patterns with lucide-react icons.
 */

import { useState, useRef } from 'react';
import { Upload, Check, X, CloudUpload, FileVideo, Loader2 } from 'lucide-react';
import { backendUploadService, type UploadProgress, type FileType } from '@/services/backendUploadService';
import Button from '@/components/ui/Button';

interface FileUploaderProps {
  onUploadComplete: (fileUrl: string, fileName: string, fileId: string, fileSize?: number) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  fileType: FileType; // 'raw-footage', 'edited-video', or 'final-video'
  projectId?: string; // Content ID like "BCHFIT001"
  analysisId?: string; // Database ID
  disabled?: boolean;
  compact?: boolean; // Use compact mode for mobile
}

export default function FileUploader({
  onUploadComplete,
  acceptedFileTypes = 'video/*',
  maxSizeMB = 500,
  fileType,
  projectId,
  analysisId,
  disabled = false,
  compact = false,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setErrorMessage(`File size must be less than ${maxSizeMB}MB`);
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
    setProgress({ loaded: 0, total: 0, percentage: 0 });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file first');
      setUploadStatus('error');
      return;
    }

    try {
      setUploading(true);
      setUploadStatus('uploading');
      setErrorMessage('');

      // Upload via backend (no OAuth needed!)
      const result = await backendUploadService.uploadFile(
        selectedFile,
        fileType,
        projectId,
        analysisId,
        (progressData) => {
          setProgress(progressData);
        }
      );

      setUploadStatus('success');

      // Call the callback with the shareable link
      onUploadComplete(result.webViewLink, result.fileName, result.fileId, result.size);

      // Reset state after a moment
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
        setProgress({ loaded: 0, total: 0, percentage: 0 });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (uploading) {
      backendUploadService.cancelUpload();
    }
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getUploadTypeLabel = () => {
    switch (fileType) {
      case 'raw-footage':
        return 'Raw Footage';
      case 'edited-video':
        return 'Edited Video';
      case 'final-video':
        return 'Final Video';
      default:
        return 'File';
    }
  };

  const inputId = `file-upload-${fileType}-${analysisId || 'new'}`;

  // Compact Mode (for inline usage)
  if (compact) {
    return (
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          id={inputId}
        />

        {/* No file selected */}
        {!selectedFile && uploadStatus !== 'success' && (
          <label
            htmlFor={inputId}
            className={`flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer active:bg-gray-50 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">Upload {getUploadTypeLabel()}</p>
              <p className="text-xs text-gray-500 truncate">Max {maxSizeMB}MB</p>
            </div>
          </label>
        )}

        {/* File selected, ready to upload */}
        {selectedFile && uploadStatus === 'idle' && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <FileVideo className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={handleCancel}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Button
              onClick={handleUpload}
              fullWidth
              size="sm"
            >
              <CloudUpload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        )}

        {/* Uploading */}
        {uploadStatus === 'uploading' && (
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{selectedFile?.name}</p>
                <p className="text-xs text-blue-600">{progress.percentage}% complete</p>
              </div>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {uploadStatus === 'success' && (
          <div className="p-4 bg-green-50 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 text-sm">Upload Complete!</p>
              <p className="text-xs text-green-600">File saved to Google Drive</p>
            </div>
          </div>
        )}

        {/* Error */}
        {uploadStatus === 'error' && (
          <div className="p-4 bg-red-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-800 text-sm">Upload Failed</p>
                <p className="text-xs text-red-600">{errorMessage}</p>
              </div>
            </div>
            <Button
              onClick={handleCancel}
              variant="outline"
              fullWidth
              size="sm"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full Mode (card-based)
  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        id={inputId}
      />

      {/* Empty State - File Selection */}
      {!selectedFile && uploadStatus !== 'success' && (
        <div className={`border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center transition ${disabled ? 'opacity-50' : 'hover:border-primary/50 active:border-primary active:bg-primary/5'}`}>
          <label
            htmlFor={inputId}
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CloudUpload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Upload {getUploadTypeLabel()}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Tap to select a video file
            </p>
            <p className="text-xs text-gray-400">
              {acceptedFileTypes === 'video/*' ? 'Video files' : 'Supported files'} up to {maxSizeMB}MB
            </p>
            {projectId && (
              <span className="mt-3 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                Project: {projectId}
              </span>
            )}
          </label>
        </div>
      )}

      {/* File Selected - Confirmation */}
      {selectedFile && uploadStatus === 'idle' && (
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileVideo className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {selectedFile.name}
              </h4>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatFileSize(selectedFile.size)} • {getUploadTypeLabel()}
              </p>
              {projectId && (
                <span className="mt-2 inline-flex px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {projectId}
                </span>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Button onClick={handleUpload} fullWidth>
            <CloudUpload className="w-5 h-5" />
            Upload to Google Drive
          </Button>
        </div>
      )}

      {/* Uploading Progress */}
      {uploadStatus === 'uploading' && (
        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CloudUpload className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {selectedFile?.name}
              </h4>
              <p className="text-sm text-blue-600 mt-0.5">
                Uploading to Google Drive...
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="w-full bg-blue-100 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-blue-700 font-medium">{progress.percentage}%</span>
            <span className="text-blue-600">
              {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
            </span>
          </div>

          <Button
            onClick={handleCancel}
            variant="outline"
            fullWidth
            className="mt-4"
          >
            Cancel Upload
          </Button>
        </div>
      )}

      {/* Upload Success */}
      {uploadStatus === 'success' && (
        <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-900 mb-1">Upload Complete!</h3>
            <p className="text-sm text-green-700">
              File has been saved to Google Drive
            </p>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadStatus === 'error' && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">Upload Failed</h4>
              <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>

          <Button
            onClick={handleCancel}
            variant="outline"
            fullWidth
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
