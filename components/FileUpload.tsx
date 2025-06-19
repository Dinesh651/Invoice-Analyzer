
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  isLoading: boolean;
}

const supportedMimeTypes: string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const acceptString = supportedMimeTypes.join(',');

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileCount, setSelectedFileCount] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const processAndRelayFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setSelectedFileCount(0);
      setFeedbackMessage(null);
      onFileUpload([]); // Notify parent if selection is cleared
      return;
    }

    const allFiles = Array.from(fileList);
    const validFiles = allFiles.filter(file => supportedMimeTypes.includes(file.type));
    const ignoredCount = allFiles.length - validFiles.length;

    onFileUpload(validFiles);
    setSelectedFileCount(validFiles.length);

    if (validFiles.length === 0 && allFiles.length > 0) {
      setFeedbackMessage(`No supported files found. Please upload PDF, JPG, PNG, or WEBP files. (${ignoredCount} file(s) ignored).`);
    } else if (ignoredCount > 0) {
      setFeedbackMessage(`Note: ${ignoredCount} unsupported file(s) were ignored. Only PDF, JPG, PNG, and WEBP are processed.`);
    } else {
      setFeedbackMessage(null);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processAndRelayFiles(e.dataTransfer.files);
  }, [onFileUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    processAndRelayFiles(e.target.files);
    if (e.target) {
        e.target.value = ''; // Reset input to allow re-selecting same file(s)
    }
  }, [onFileUpload]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <label
        htmlFor="invoice-upload"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
                    ${dragActive ? 'border-sky-500 bg-slate-700' : 'border-slate-600 hover:border-sky-400 bg-slate-700/50 hover:bg-slate-700'}`}
        aria-disabled={isLoading}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
          <UploadIcon className={`w-12 h-12 mb-3 ${dragActive ? 'text-sky-400' : 'text-slate-400'}`} />
          <p className={`mb-2 text-sm ${dragActive ? 'text-sky-300' : 'text-slate-300'}`}>
            <span className="font-semibold">Click to upload PDFs or Images</span> or drag and drop
          </p>
          <p className={`text-xs ${dragActive ? 'text-sky-400' : 'text-slate-500'}`}>
            Supported: PDF, JPG, PNG, WEBP (Max 5MB each)
          </p>
          
          {!isLoading && selectedFileCount > 0 && !feedbackMessage && (
            <p className="mt-3 text-sm text-green-400">Selected {selectedFileCount} file(s).</p>
          )}
          {!isLoading && feedbackMessage && (
             <p className={`mt-3 text-sm ${feedbackMessage.startsWith("No supported files") ? 'text-red-400' : 'text-amber-400'}`}>
                {feedbackMessage}
             </p>
          )}
          {isLoading && <p className="mt-3 text-sm text-sky-400">Uploading and processing...</p>}
        </div>
        <input 
          id="invoice-upload" 
          type="file" 
          className="hidden" 
          onChange={handleChange} 
          accept={acceptString}
          multiple 
          disabled={isLoading} 
        />
      </label>
    </div>
  );
};
