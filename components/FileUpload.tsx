
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void; // Changed to accept File[]
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileCount, setFileCount] = useState<number>(0);
  const [nonPdfWarning, setNonPdfWarning] = useState<boolean>(false);

  const processAndRelayFiles = (fileList: FileList | null) => {
    if (!fileList) {
      setFileCount(0);
      setNonPdfWarning(false);
      return;
    }
    const allFiles = Array.from(fileList);
    const pdfFiles = allFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      onFileUpload(pdfFiles);
      setFileCount(pdfFiles.length);
      setNonPdfWarning(allFiles.length > pdfFiles.length);
    } else {
      onFileUpload([]); // Send empty array if no PDFs
      setFileCount(0);
      setNonPdfWarning(allFiles.length > 0 && pdfFiles.length === 0); // Warn if files selected but no PDFs
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
  }, [onFileUpload]); // processAndRelayFiles is stable due to its definition, but include onFileUpload

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    processAndRelayFiles(e.target.files);
    // Reset input value to allow selecting the same file(s) again
    if (e.target) {
        e.target.value = '';
    }
  }, [onFileUpload]); // processAndRelayFiles is stable

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
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className={`w-12 h-12 mb-3 ${dragActive ? 'text-sky-400' : 'text-slate-400'}`} />
          <p className={`mb-2 text-sm ${dragActive ? 'text-sky-300' : 'text-slate-300'}`}>
            <span className="font-semibold">Click to upload PDFs</span> or drag and drop
          </p>
          <p className={`text-xs ${dragActive ? 'text-sky-400' : 'text-slate-500'}`}>Multiple PDF files accepted (Max 5MB each)</p>
          
          {!isLoading && fileCount > 0 && <p className="mt-3 text-sm text-green-400">Selected {fileCount} PDF file(s).</p>}
          {!isLoading && nonPdfWarning && <p className="mt-2 text-sm text-amber-400">Note: Only PDF files are processed. Other selected files were ignored.</p>}
          {isLoading && <p className="mt-3 text-sm text-sky-400">Uploading and processing with AI...</p>}
        </div>
        <input 
          id="invoice-upload" 
          type="file" 
          className="hidden" 
          onChange={handleChange} 
          accept=".pdf" // Restrict to PDF in file dialog
          multiple // Allow multiple file selection
          disabled={isLoading} 
        />
      </label>
    </div>
  );
};
