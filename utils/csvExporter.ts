
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
    return;
  }

  // Define the exact order of keys from InvoiceItem to be exported.
  // These keys will also be used as the header titles.
  const orderedKeys: ReadonlyArray<keyof Omit<InvoiceItem, 'id'>> = [
    'date', 
    'invoiceNumber', 
    'partyName', 
    'panOrVatNumber', // Added PAN/VAT
    'particulars', 
    'taxableAmount', 
    'vatAmount', 
    'totalAmount', 
    'sourceFileName',
    'vatCredit'
  ];

  // Create the header row string by formatting each key name.
  const headerString = orderedKeys.map(key => formatCsvCell(key)).join(',');

  let csvContent = headerString + '\r\n';
  
  for (const row of rows) {
    const line = orderedKeys.map(key => {
      let valueToFormat: any;
      
      // Access the value from the row object based on the key.
      // Handle potentially undefined optional fields gracefully.
      if (key === 'sourceFileName') {
        // Use nullish coalescing to default to an empty string if undefined/null.
        valueToFormat = row.sourceFileName ?? ''; 
      } else if (key === 'vatCredit') {
        // Ensure boolean for consistent TRUE/FALSE output, default to false if undefined/null.
        valueToFormat = typeof row.vatCredit === 'boolean' ? row.vatCredit : false;
      } else {
        // For other keys (date, invoiceNumber, etc.), which are expected to be present
        // as string or number based on InvoiceItem type (after Omit<'id'>).
        // If a field could be legitimately null/undefined from parsing, it will be handled by formatCsvCell.
        valueToFormat = row[key as Exclude<typeof key, 'sourceFileName' | 'vatCredit'>];
      }
      return formatCsvCell(valueToFormat);
    }).join(',');
    csvContent += line + '\r\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    alert("CSV export is not supported in this browser.");
  }
};