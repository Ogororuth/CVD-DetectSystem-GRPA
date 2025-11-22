'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { scansAPI } from '@/app/lib/api';
import { ChevronLeft, Upload, X, AlertCircle, Info } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG or PNG image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (notes) {
        formData.append('notes', notes);
      }

      const response = await scansAPI.upload(formData);
      
      router.push(`/scans/${response.data.scan.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setNotes('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 text-xs font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">ECG Analysis</h1>
          <p className="text-gray-600 mt-1 text-xs">
            Upload electrocardiogram image for cardiac assessment
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-10 text-center transition ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="mb-4">
                <div className="inline-block p-3 bg-gray-100 rounded-md mb-3">
                  <Upload className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Select ECG Image
                </h3>
                <p className="text-gray-600 mb-3 text-xs">Drag and drop or click to browse</p>
                <p className="text-xs text-gray-500">
                  Formats: JPG, PNG • Maximum: 10MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileInput}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-xs"
              >
                Choose File
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Selected Image
                </label>
                <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                  {previewUrl && (
                    <img
                      src={previewUrl || undefined}
                      alt="ECG Preview"
                      className="w-full h-56 object-contain bg-gray-50"
                    />
                  )}
                  <button
                    onClick={handleCancel}
                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {selectedFile.name} • {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-2">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs"
                  placeholder="Enter relevant clinical observations"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      Processing Analysis
                    </span>
                  ) : (
                    'Submit for Analysis'
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={uploading}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium disabled:opacity-50 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1 text-xs">Image Requirements</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>Clear image with all leads visible</li>
              <li>Adequate lighting and contrast</li>
              <li>Formats: JPEG, PNG (max 10MB)</li>
              <li>Processing time: 2-5 seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}