
export interface InvoiceItem {
  id: string;
  date: string;
  invoiceNumber: string;
  partyName: string;
  panOrVatNumber: string; // New field for Seller's PAN/VAT
  particulars: string; // Extracted description of goods/services, or "N/A"
  taxableAmount: number; // Extracted taxable amount, plain number
  vatAmount: number;     // Extracted VAT amount, plain number
  totalAmount: number;   // The grand total of the invoice, plain number
  sourceFileName?: string;
  vatCredit?: boolean; // Added for VAT credit tracking
}

export interface ParsedInvoice {
  fileName: string;
  items: InvoiceItem[]; // Can contain multiple InvoiceItems if a single file has multiple invoices
}

export enum GeminiModel {
    GEMINI_FLASH = "gemini-2.5-flash",
}
