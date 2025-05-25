
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { InvoiceTable } from './components/InvoiceTable';
import { GeminiInterface } from './components/GeminiInterface';
import { InvoiceItem } from './types';
import { extractActualInvoiceData } from './services/invoiceParserService';
import { exportToCsv } from './utils/csvExporter';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { LogoIcon } from './components/icons/LogoIcon';

interface ProcessingStatus {
  successfulFiles: string[];
  failedFiles: { fileName: string; error: string }[];
  isProcessing: boolean;
  totalFilesAttempted: number;
}

const App: React.FC = () => {
  const [allInvoiceItems, setAllInvoiceItems] = useState<InvoiceItem[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    successfulFiles: [],
    failedFiles: [],
    isProcessing: false,
    totalFilesAttempted: 0,
  });

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) {
        // This case might occur if FileUpload sends an empty array 
        // (e.g., user selected non-PDFs which got filtered out before callback)
        // or if the user cancels the dialog after selecting files.
        // We can choose to show a message or just reset.
        if (processingStatus.totalFilesAttempted > 0 && files.length === 0 && !processingStatus.isProcessing) {
            // This means FileUpload might have filtered out all selected files as non-PDF
            // and FileUpload component itself shows a warning.
        } else if (!processingStatus.isProcessing) {
           // If not already processing and no files, just ensure state is clean.
           setProcessingStatus({ successfulFiles: [], failedFiles: [], isProcessing: false, totalFilesAttempted: 0 });
           setAllInvoiceItems([]);
        }
        return;
    }

    setProcessingStatus({ 
      successfulFiles: [], 
      failedFiles: [], 
      isProcessing: true, 
      totalFilesAttempted: files.length 
    });
    setAllInvoiceItems([]); // Clear previous results

    const results = await Promise.allSettled(
      files.map(file => extractActualInvoiceData(file))
    );

    const newAllItems: InvoiceItem[] = [];
    const newSuccessfulFiles: string[] = [];
    const newFailedFiles: { fileName: string; error: string }[] = [];

    results.forEach((result, index) => {
      const file = files[index];
      if (result.status === 'fulfilled') {
        const parsedData = result.value;
        parsedData.items.forEach(item => {
          newAllItems.push({ ...item, sourceFileName: file.name });
        });
        newSuccessfulFiles.push(file.name);
      } else {
        let errorMessage = "Failed to process.";
        if (result.reason instanceof Error) {
          errorMessage = result.reason.message;
        }
        // Specific error for API key issues
        if (errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("api_key")) {
            errorMessage = "Error with Gemini API Key. Please ensure it's correctly configured."
        }
        newFailedFiles.push({ fileName: file.name, error: errorMessage });
      }
    });

    setAllInvoiceItems(newAllItems);
    setProcessingStatus({
      successfulFiles: newSuccessfulFiles,
      failedFiles: newFailedFiles,
      isProcessing: false,
      totalFilesAttempted: files.length,
    });
  }, [processingStatus.isProcessing, processingStatus.totalFilesAttempted]); // Added dependencies for safety

  const handleDownloadCsv = () => {
    if (allInvoiceItems.length > 0) {
      // Create a more generic filename for multiple files
      const date = new Date().toISOString().split('T')[0];
      exportToCsv(`invoice_items_batch_${date}.csv`, allInvoiceItems);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <LogoIcon className="h-12 w-12 mr-3 text-sky-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
            Invoice Analyzer AI
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          Upload one or more PDF invoice documents to extract data and gain AI-powered insights.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-sky-400">1. Upload Invoice PDF(s)</h2>
          <FileUpload onFileUpload={handleFileUpload} isLoading={processingStatus.isProcessing} />
          
          {/* Display messages for failed files */}
          {!processingStatus.isProcessing && processingStatus.failedFiles.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/30 rounded-md">
              <h3 className="text-red-300 font-semibold mb-2">Processing Errors:</h3>
              <ul className="list-disc list-inside text-red-400 text-sm">
                {processingStatus.failedFiles.map((failure, index) => (
                  <li key={index}><strong>{failure.fileName}:</strong> {failure.error}</li>
                ))}
              </ul>
            </div>
          )}
           {/* Display message if no PDFs were found among selected files (handled by FileUpload itself usually) */}
           {!processingStatus.isProcessing && processingStatus.totalFilesAttempted > 0 && processingStatus.successfulFiles.length === 0 && processingStatus.failedFiles.length === processingStatus.totalFilesAttempted && (
             <p className="text-amber-400 mt-4 text-center p-3 bg-amber-900/30 rounded-md">
                No PDF files were successfully processed. Please ensure you are uploading valid PDF documents.
             </p>
           )}

        </section>

        {processingStatus.isProcessing && (
          <div className="flex flex-col justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-500"></div>
            <p className="ml-4 text-xl text-slate-300 mt-4">
              Analyzing {processingStatus.totalFilesAttempted > 1 ? `${processingStatus.totalFilesAttempted} invoices` : `invoice`} with AI... this may take a moment.
            </p>
          </div>
        )}

        {!processingStatus.isProcessing && allInvoiceItems.length > 0 && (
          <>
            <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-2xl font-semibold text-sky-400 mb-2 sm:mb-0">
                  2. Extracted Invoice Data 
                  {processingStatus.successfulFiles.length > 0 && 
                    <span className="text-base text-slate-400 ml-2">
                        (from {processingStatus.successfulFiles.length} file(s): {processingStatus.successfulFiles.join(', ').substring(0, 100) + (processingStatus.successfulFiles.join(', ').length > 100 ? '...' : '')})
                    </span>}
                </h2>
                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 mt-3 sm:mt-0"
                >
                  <DownloadIcon className="h-5 w-5 mr-2" />
                  Download All as CSV
                </button>
              </div>
              <InvoiceTable items={allInvoiceItems} />
            </section>

            <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
               <h2 className="text-2xl font-semibold mb-6 text-sky-400">3. AI Insights for All Extracted Data</h2>
              <GeminiInterface invoiceItems={allInvoiceItems} />
            </section>
          </>
        )}
        
        {!processingStatus.isProcessing && processingStatus.totalFilesAttempted > 0 && allInvoiceItems.length === 0 && processingStatus.failedFiles.length === processingStatus.totalFilesAttempted && (
            <p className="text-slate-400 text-center py-4 text-lg">
                No items were extracted. The AI might not have been able to identify structured data in the provided PDF(s), or there were processing errors. Please check error messages above.
            </p>
        )}


      </main>

      <footer className="text-center mt-12 py-6 border-t border-slate-700">
        <p className="text-slate-500">&copy; {new Date().getFullYear()} Invoice Analyzer AI. All rights reserved.</p>
        <p className="text-sm text-slate-600 mt-1">Powered by React, Tailwind CSS, and Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
