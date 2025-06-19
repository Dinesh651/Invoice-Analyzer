
import React, { useState, useCallback, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { InvoiceTable } from './components/InvoiceTable';
import { GeminiInterface } from './components/GeminiInterface';
import { InvoiceItem } from './types';
import { extractActualInvoiceData } from './services/invoiceParserService';
import { exportToCsv } from './utils/csvExporter';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { LogoIcon } from './components/icons/LogoIcon';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';

interface ProcessingStatus {
  successfulFiles: string[]; // Files successfully processed in the LAST batch
  failedFiles: { fileName: string; error: string }[]; // Files failed in the LAST batch
  isProcessing: boolean;
  totalFilesAttempted: number; // Files attempted in the LAST batch
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
        // This handles cases where file selection is cleared or no files are submitted.
        // It does not alter allInvoiceItems if already populated.
        // It may reset processingStatus if no prior attempt or not currently processing.
        if (processingStatus.totalFilesAttempted > 0 && !processingStatus.isProcessing) {
            // User cleared selection after a previous upload, do nothing to processingStatus here.
            // FileUpload component will show its own feedback.
        } else if (!processingStatus.isProcessing) {
           setProcessingStatus({ successfulFiles: [], failedFiles: [], isProcessing: false, totalFilesAttempted: 0 });
        }
        return;
    }

    setProcessingStatus({ 
      successfulFiles: [], // Reset for the current batch
      failedFiles: [], // Reset for the current batch
      isProcessing: true, 
      totalFilesAttempted: files.length 
    });
    // DO NOT RESET allInvoiceItems here: setAllInvoiceItems([]); 

    const results = await Promise.allSettled(
      files.map(file => extractActualInvoiceData(file))
    );

    const newItemsFromThisBatch: InvoiceItem[] = [];
    const newSuccessfulFiles: string[] = [];
    const newFailedFiles: { fileName: string; error: string }[] = [];

    results.forEach((result, index) => {
      const file = files[index];
      if (result.status === 'fulfilled') {
        const parsedData = result.value;
        parsedData.items.forEach(item => {
          newItemsFromThisBatch.push({ ...item, sourceFileName: file.name, vatCredit: false });
        });
        newSuccessfulFiles.push(file.name);
      } else {
        let errorMessage = "Failed to process.";
        if (result.reason instanceof Error) {
          errorMessage = result.reason.message;
        }
        if (errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("api_key")) {
            errorMessage = "Error with Gemini API Key. Please ensure it's correctly configured."
        }
        newFailedFiles.push({ fileName: file.name, error: errorMessage });
      }
    });

    setAllInvoiceItems(prevItems => [...prevItems, ...newItemsFromThisBatch]); // Append new items
    setProcessingStatus({
      successfulFiles: newSuccessfulFiles, // Reflects current batch
      failedFiles: newFailedFiles, // Reflects current batch
      isProcessing: false,
      totalFilesAttempted: files.length, // Reflects current batch
    });
  }, [processingStatus.isProcessing, processingStatus.totalFilesAttempted]);

  const handleDownloadCsv = () => {
    if (allInvoiceItems.length > 0) {
      const date = new Date().toISOString().split('T')[0];
      exportToCsv(`invoice_items_batch_${date}.csv`, allInvoiceItems);
    }
  };

  const handleVatCreditChange = useCallback((itemId: string, checked: boolean) => {
    setAllInvoiceItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, vatCredit: checked } : item
      )
    );
  }, []);

  const handleProceedVatReturn = () => {
    const vatCreditItems = allInvoiceItems.filter(item => item.vatCredit);
    if (vatCreditItems.length > 0) {
      const date = new Date().toISOString().split('T')[0];
      exportToCsv(`vat_return_items_${date}.csv`, vatCreditItems);
    }
  };

  const hasVatCreditItems = useMemo(() => {
    return allInvoiceItems.some(item => item.vatCredit);
  }, [allInvoiceItems]);

  const uniqueSuccessfulSourceFiles = useMemo(() => {
    if (allInvoiceItems.length === 0) return [];
    const fileNames = allInvoiceItems
      .map(item => item.sourceFileName)
      .filter(name => typeof name === 'string' && name.length > 0) as string[];
    return [...new Set(fileNames)];
  }, [allInvoiceItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-slate-100 p-4 md:p-8 font-sans">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <LogoIcon className="h-12 w-12 mr-3 text-sky-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
            TaxEase Invoice Analyzer
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          Upload one or more PDF or image invoice documents to extract data and gain AI-powered insights.
        </p>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-sky-400">1. Upload Invoice PDF(s) or Image(s)</h2>
          <FileUpload onFileUpload={handleFileUpload} isLoading={processingStatus.isProcessing} />
          
          {/* Following messages relate to the LAST batch processed */}
          {!processingStatus.isProcessing && processingStatus.failedFiles.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/30 rounded-md">
              <h3 className="text-red-300 font-semibold mb-2">Processing Errors (Last Batch):</h3>
              <ul className="list-disc list-inside text-red-400 text-sm">
                {processingStatus.failedFiles.map((failure, index) => (
                  <li key={index}><strong>{failure.fileName}:</strong> {failure.error}</li>
                ))}
              </ul>
            </div>
          )}
           {!processingStatus.isProcessing && processingStatus.totalFilesAttempted > 0 && processingStatus.successfulFiles.length === 0 && processingStatus.failedFiles.length === processingStatus.totalFilesAttempted && (
             <p className="text-amber-400 mt-4 text-center p-3 bg-amber-900/30 rounded-md">
                No files were successfully processed in the last batch. Please ensure you are uploading valid PDF or image documents (JPEG, PNG, WEBP).
             </p>
           )}
        </section>

        {processingStatus.isProcessing && (
          <div className="flex flex-col justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-500"></div>
            <p className="ml-4 text-xl text-slate-300 mt-4">
              Analyzing {processingStatus.totalFilesAttempted > 1 ? `${processingStatus.totalFilesAttempted} files` : `file`} with AI... this may take a moment.
            </p>
          </div>
        )}

        {!processingStatus.isProcessing && allInvoiceItems.length > 0 && (
          <>
            <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-2xl font-semibold text-sky-400 mb-2 sm:mb-0">
                  2. Extracted Invoice Data 
                  {uniqueSuccessfulSourceFiles.length > 0 && 
                    <span className="text-base text-slate-400 ml-2">
                        (from {uniqueSuccessfulSourceFiles.length} file(s): {uniqueSuccessfulSourceFiles.join(', ').substring(0, 100) + (uniqueSuccessfulSourceFiles.join(', ').length > 100 ? '...' : '')})
                    </span>}
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 mt-3 sm:mt-0">
                  <button
                    onClick={handleDownloadCsv}
                    className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  >
                    <DownloadIcon className="h-5 w-5 mr-2" />
                    Download All as CSV
                  </button>
                  <button
                    onClick={handleProceedVatReturn}
                    disabled={!hasVatCreditItems}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Proceed for VAT Return
                  </button>
                </div>
              </div>
              <InvoiceTable items={allInvoiceItems} onVatCreditChange={handleVatCreditChange} />
            </section>

            <section className="bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
               <h2 className="text-2xl font-semibold mb-6 text-sky-400">3. AI Insights for All Extracted Data</h2>
              <GeminiInterface invoiceItems={allInvoiceItems} />
            </section>
          </>
        )}
        
        {/* Message for when NO items have been extracted EVER after an attempt */}
        {!processingStatus.isProcessing && 
         processingStatus.totalFilesAttempted > 0 && // An attempt was made in the last batch
         allInvoiceItems.length === 0 && // Still no items overall
         processingStatus.failedFiles.length === processingStatus.totalFilesAttempted && // All files in last batch failed
          (
            <p className="text-slate-400 text-center py-4 text-lg">
                No items were extracted. The AI might not have been able to identify structured data in the provided file(s), or there were processing errors. Please check error messages above.
            </p>
        )}
      </main>

      <footer className="text-center mt-12 py-6 border-t border-slate-700">
        <p className="text-slate-500">&copy; {new Date().getFullYear()} TaxEase Invoice Analyzer. All rights reserved.</p>
        <p className="text-sm text-slate-600 mt-1">Powered by React, Tailwind CSS, and Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
