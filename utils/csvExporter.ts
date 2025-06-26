
import { InvoiceItem } from '../types';

// Helper function to convert any value to a string suitable for CSV cell
// and apply CSV escaping rules (quoting and doubling internal quotes).
const formatCsvCell = (value: any): string => {
  if (value === null || typeof value === 'undefined') {
    return ''; // Empty string for null or undefined
  }

  let stringValue: string;
  if (typeof value === 'boolean') {
    stringValue = value ? 'TRUE' : 'FALSE';
  } else {
    // Convert other types (number, string, etc.) to string
    stringValue = String(value);
  }

  // Check if the string contains characters that require CSV quoting:
  // comma, double quote, or newline characters (CR or LF).
  if (/[",\r\n]/.test(stringValue)) {
    // Enclose in double quotes and double up any internal double quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  // Return the string as is if no special characters are present
  return stringValue;
};

// Standard browser download function
const triggerStandardBrowserDownload = (filename: string, csvContent: string, mimeType: string): void => {
  const blob = new Blob([csvContent], { type: mimeType });
  const link = document.createElement('a');

  if (link.download !== undefined) { // Check if the download attribute is supported
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    try {
      link.click();
      console.log(`Attempting standard browser download for '${filename}'.`);
    } catch (e) {
      console.error("Error during standard CSV export click:", e);
      alert(`CSV export failed: ${(e as Error).message}. This can happen due to browser security restrictions.`);
    } finally {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }
  } else {
    alert("CSV export is not directly supported in this browser environment. For webview applications without a Python bridge, this feature may not work.");
    console.warn("Download attribute not supported on <a> tag. CSV Content for manual copy:\n", csvContent);
  }
};


// TypeScript global declarations for window properties
declare global {
  interface Window {
    onSaveResult?: (result: { success: boolean; error?: string; path?: string }) => void;
    pywebview?: {
      api?: {
        save_file?: (filename: string, content: string, mimeType: string) => Promise<any>;
        [key: string]: any; 
      };
      [key: string]: any;
    };
  }
}

// Store data for the current pywebview save operation that relies on window.onSaveResult
interface PywebviewSaveContext {
  filename: string;
  csvContent: string;
  mimeType: string;
}
let activePywebviewSave: PywebviewSaveContext | null = null;

// Define the function and attach it to window
// This function will be called by Python using evaluate_js
window.onSaveResult = (result: { success: boolean; error?: string; path?: string }) => {
  const context = activePywebviewSave;
  activePywebviewSave = null; // Clear context once handled

  if (result && result.success) {
    console.log("File saved successfully via onSaveResult:", result.path);
    alert(`File saved successfully: ${result.path || (context ? context.filename : 'file')}`);
  } else {
    const error = result?.error || "Unknown error from Python";
    console.error("Failed to save file via onSaveResult:", error);
    alert(`Could not save file: ${error}. Falling back to browser download.`);
    if (context) {
      triggerStandardBrowserDownload(context.filename, context.csvContent, context.mimeType);
    } else {
      console.warn("Fallback browser download from onSaveResult failed: No context was available for filename, content, mimeType.");
      alert("Fallback download could not be initiated as original file details were not available.");
    }
  }
};


export const exportToCsv = (filename: string, rows: InvoiceItem[]): void => {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    return;
  }

  const orderedKeys: ReadonlyArray<keyof Omit<InvoiceItem, 'id'>> = [
    'date', 
    'invoiceNumber', 
    'partyName', 
    'panOrVatNumber',
    'particulars', 
    'taxableAmount', 
    'vatAmount', 
    'totalAmount', 
    'sourceFileName',
    'vatCredit'
  ];

  const headerString = orderedKeys.map(key => formatCsvCell(key)).join(',');
  let csvContent = headerString + '\r\n';
  
  for (const row of rows) {
    const line = orderedKeys.map(key => {
      let valueToFormat: any;
      if (key === 'sourceFileName') {
        valueToFormat = row.sourceFileName ?? ''; 
      } else if (key === 'vatCredit') {
        valueToFormat = typeof row.vatCredit === 'boolean' ? row.vatCredit : false;
      } else {
        valueToFormat = row[key]; 
      }
      return formatCsvCell(valueToFormat);
    }).join(',');
    csvContent += line + '\r\n';
  }

  const mimeType = 'text/csv;charset=utf-8';

  // Check if running in pywebview and if the API bridge exists
  if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.save_file === 'function') {
    console.log(`pywebview environment detected. Attempting download via Python for: ${filename}. Result will be handled by window.onSaveResult.`);
    
    activePywebviewSave = { filename, csvContent, mimeType };

    window.pywebview.api.save_file(filename, csvContent, mimeType)
      .then((directPromiseResult: any) => {
        // This promise from save_file itself is now expected to be minimal if onSaveResult is the primary channel.
        // It might resolve (e.g., with undefined) after Python initiates the evaluate_js call.
        console.log("Python's save_file function invoked. Direct promise resolved with:", directPromiseResult);
        // If the save_file promise itself resolves with a full status, and onSaveResult has not fired / cleared context,
        // this could lead to double handling. The current design prioritizes onSaveResult.
        // If 'activePywebviewSave' is still set, it implies 'onSaveResult' hasn't been called or Python doesn't use it.
        // However, the request implies 'onSaveResult' IS the mechanism.
      })
      .catch((error: any) => {
        // This .catch() is for failures in *calling* window.pywebview.api.save_file (e.g., bridge error),
        // not for the operational success/failure of the file save itself (which onSaveResult handles).
        console.error("Error invoking pywebview.api.save_file:", error);
        alert("Error communicating with Python backend for file download. The pywebview bridge might be unavailable. Falling back to browser download.");
        if (activePywebviewSave) { // Fallback if the call itself fails
          triggerStandardBrowserDownload(
            activePywebviewSave.filename,
            activePywebviewSave.csvContent,
            activePywebviewSave.mimeType
          );
          activePywebviewSave = null; // Clear context as we've handled the failure.
        }
      });
  } else {
    // Standard browser download logic
    console.log("Not in pywebview or save_file API not found. Using standard browser download.");
    triggerStandardBrowserDownload(filename, csvContent, mimeType);
  }
};
