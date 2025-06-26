
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

export const exportToCsv = (filename: string, rows: InvoiceItem[]): void => {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    // Optionally, alert the user or provide UI feedback
    // alert("No data available to export.");
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
        // Simplified access: TypeScript's control flow analysis understands that
        // 'key' here refers to the remaining direct properties of InvoiceItem.
        valueToFormat = row[key]; 
      }
      return formatCsvCell(valueToFormat);
    }).join(',');
    csvContent += line + '\r\n';
  }

  const mimeType = 'text/csv;charset=utf-8';

  // Check if running in pywebview and if the API bridge exists
  // @ts-ignore - pywebview is injected by the Python host
  if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.save_file === 'function') {
    console.log(`pywebview environment detected. Attempting to download via Python bridge: ${filename}`);
    // @ts-ignore - pywebview is injected by the Python host
    window.pywebview.api.save_file(filename, csvContent, mimeType)
      .then((result: { success: boolean; error?: string; path?: string }) => {
        if (result && result.success) {
          console.log(`CSV data successfully sent to Python for saving: ${filename} at ${result.path || ''}`);
          // You could add a UI notification here if desired
          // alert(`File saved successfully: ${result.path || filename}`);
        } else {
          const pythonError = result?.error || 'Unknown error from Python side.';
          console.error(`Python save_file reported an issue: ${pythonError}`);
          alert(`Could not save file via Python: ${pythonError}. Attempting fallback browser download.`);
          triggerStandardBrowserDownload(filename, csvContent, mimeType); // Fallback added here
        }
      })
      .catch((error: any) => {
        console.error("Error calling pywebview.api.save_file bridge:", error);
        alert("Error communicating with Python for file download. The pywebview bridge might not be set up correctly. Attempting fallback browser download.");
        triggerStandardBrowserDownload(filename, csvContent, mimeType); // Existing fallback
      });
  } else {
    // Standard browser download logic
    console.log("Not in pywebview or save_file API not found. Using standard browser download.");
    triggerStandardBrowserDownload(filename, csvContent, mimeType);
  }
};

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
