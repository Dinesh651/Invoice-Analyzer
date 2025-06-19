
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
        valueToFormat = row[key as Exclude<typeof key, 'sourceFileName' | 'vatCredit'>];
      }
      return formatCsvCell(valueToFormat);
    }).join(',');
    csvContent += line + '\r\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) { // Check if the download attribute is supported
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    try {
      link.click(); // This is the step that might fail in some webviews
      console.log(`Attempting to download '${filename}'. If the download does not start, especially in a webview environment, the webview might have restrictions. A native file download integration (Python-to-JavaScript bridge) might be required.`);
    } catch (e) {
      console.error("Error during CSV export click:", e);
      alert(`CSV export failed: ${(e as Error).message}. This can happen due to browser/webview security restrictions. For webview environments, a native file download bridge is often necessary.`);
    } finally {
      // Ensure cleanup even if click fails
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }
  } else {
    // This branch is for browsers/webviews that don't support `a.download` at all
    alert("CSV export is not directly supported in this environment. This could be an older browser or a restricted webview. For webview applications, please ensure a native file download bridge (e.g., from JavaScript to Python) is implemented to handle file saving.");
    // As a fallback for debugging or if the user *really* needs the data:
    // console.log("CSV Content for manual copy:\n", csvContent);
  }
};
