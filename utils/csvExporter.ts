import { InvoiceItem } from '../types';

// Define more specific types for File System Access API if needed,
// or use broad types like `object` or `any` if the exact structure of options isn't critical.
interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

// This type alias covers the common types accepted by the write() method.
type FileSystemWriteChunkType = BufferSource | Blob | string | DataView;


declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept?: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
    // pywebview is injected dynamically, declare for TypeScript
    pywebview?: {
      api?: {
        save_file?: (filename: string, content: string, mimeType: string) => Promise<{ success: boolean; error?: string; path?: string }>;
      };
    };
  }

  // These interfaces are part of the File System Access API
  interface FileSystemFileHandle {
    createWritable: (options?: FileSystemCreateWritableOptions) => Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write: (data: FileSystemWriteChunkType) => Promise<void>;
    // close: () => Promise<void>; // Removed: close() is inherited from WritableStream
    // abort?: (reason?: any) => Promise<void>;
    // seek?: (position: number) => Promise<void>;
    // truncate?: (size: number) => Promise<void>;
  }
}


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

// Legacy download method using an <a> tag
const triggerStandardLegacyDownload = (filename: string, csvContent: string, mimeType: string): void => {
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
      console.log(`Attempting standard legacy browser download for '${filename}'.`);
    } catch (e) {
      console.error("Error during standard legacy CSV export click:", e);
      alert(`CSV export failed: ${(e as Error).message}. This can happen due to browser security restrictions.`);
    } finally {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }
  } else {
    alert("CSV export is not directly supported in this browser environment. For webview applications without a Python bridge or File System Access API, this feature may not work.");
    console.warn("Download attribute not supported on <a> tag. CSV Content for manual copy:\n", csvContent);
  }
};

// Attempts to save using File System Access API, then falls back to legacy <a> tag download
// This function aims to provide a "Save As" dialog experience where possible.
const attemptSaveWithDialogs = async (filename: string, csvContent: string, mimeType: string): Promise<void> => {
  // Try modern File System Access API first for a native "Save As" dialog
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'CSV File',
          accept: { [mimeType]: ['.csv'] },
        }],
      });
      const writable = await handle.createWritable(); // No options passed, default behavior
      await writable.write(new Blob([csvContent], { type: mimeType })); // Blob is compatible with FileSystemWriteChunkType
      await writable.close();
      console.log(`File saved successfully using File System Access API: ${filename}`);
      // alert(`File saved successfully: ${filename}`); // Optional: uncomment for user feedback
      return; // Success, no need to fallback further
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('File save dialog was cancelled by the user (File System Access API).');
        // alert('File save was cancelled.'); // Optional: uncomment for user feedback
        return; // User cancelled, do not proceed to legacy download.
      }
      console.warn("File System Access API failed, will attempt legacy download.", err);
      // Fall through to traditional download if not AbortError or API not supported
    }
  } else {
    console.log("File System Access API not supported, attempting legacy download.");
  }

  // Fallback to traditional legacy download
  triggerStandardLegacyDownload(filename, csvContent, mimeType);
};


export const exportToCsv = (filename: string, rows: InvoiceItem[]): void => {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    // alert("No data available to export."); // Optional: uncomment for user feedback
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

  // Prioritize pywebview bridge if available (typically for native dialogs via Python)
  if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.save_file === 'function') {
    console.log(`pywebview environment detected. Attempting to download via Python bridge: ${filename}`);
    window.pywebview.api.save_file(filename, csvContent, mimeType)
      .then((result: { success: boolean; error?: string; path?: string }) => {
        if (result && result.success) {
          console.log(`CSV data successfully sent to Python for saving: ${filename} at ${result.path || ''}`);
          // alert(`File saved successfully: ${result.path || filename}`); // Optional
        } else {
          const pythonError = result?.error || 'Unknown error from Python side.';
          console.error(`Python save_file reported an issue: ${pythonError}`);
          alert(`Could not save file via Python: ${pythonError}. Attempting fallback download with dialog.`);
          // Fallback to web-based dialogs if Python side fails
          attemptSaveWithDialogs(filename, csvContent, mimeType);
        }
      })
      .catch((error: any) => {
        console.error("Error calling pywebview.api.save_file bridge:", error);
        alert("Error communicating with Python for file download. The pywebview bridge might not be set up correctly. Attempting fallback download with dialog.");
        // Fallback to web-based dialogs if bridge communication fails
        attemptSaveWithDialogs(filename, csvContent, mimeType);
      });
  } else {
    // If not in pywebview or specific API not found, use web-based dialog strategy
    console.log("Not in pywebview or save_file API not found. Using fallback download with dialog strategy (File System Access API or legacy).");
    attemptSaveWithDialogs(filename, csvContent, mimeType);
  }
};