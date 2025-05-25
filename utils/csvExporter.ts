import { InvoiceItem } from '../types';

export const exportToCsv = (filename: string, rows: InvoiceItem[]): void => {
  if (!rows || rows.length === 0) {
    console.warn("No data to export.");
    return;
  }

  // Define the headers explicitly, excluding 'id'
  const desiredHeaders: (keyof Omit<InvoiceItem, 'id'>)[] = [
    'date', 
    'invoiceNumber', 
    'partyName', 
    'particulars', 
    'taxableAmount', 
    'vatAmount', 
    'totalAmount', 
    'sourceFileName'
  ];

  const replacer = (key: string, value: any): string => (value === null || typeof value === 'undefined' ? '' : String(value));
  
  let csvContent = desiredHeaders.join(',') + '\r\n';
  
  for (const row of rows) {
    const line = desiredHeaders.map(fieldName => {
      // Ensure that sourceFileName (which is optional) is handled correctly
      if (fieldName === 'sourceFileName') {
        return JSON.stringify(row[fieldName] || '', replacer);
      }
      // For other fields, directly access them. Type assertion might be needed if TypeScript complains.
      // However, since desiredHeaders are explicitly from InvoiceItem (excluding id), this should be safe.
      return JSON.stringify(row[fieldName as keyof InvoiceItem], replacer);
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