
import { InvoiceItem, ParsedInvoice } from '../types';
import { getInvoiceDetailsFromFileViaGemini, RawInvoiceSummaryFromGemini } from './geminiService';

// Helper to convert File to base64
const fileToGenerativePart = async (file: File): Promise<{inlineData: {mimeType: string, data: string}}> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      mimeType: file.type,
      data: await base64EncodedDataPromise,
    }
  };
};

// Updated function to extract data from an actual invoice file (image or PDF) using Gemini
export const extractActualInvoiceData = async (file: File): Promise<ParsedInvoice> => {
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please upload an image (PNG, JPG, JPEG) or a PDF document.');
  }
  if (file.size > 5 * 1024 * 1024) { // Max 5MB
    throw new Error("File size exceeds 5MB limit.");
  }

  try {
    const filePart = await fileToGenerativePart(file);
    
    const extractionPrompt = `
You are an expert invoice data extraction tool. The provided PDF document might contain scans of MULTIPLE distinct invoices on different pages or sections.
For EACH distinct invoice you identify within the document, extract ONLY the following details:
- date (string, the main invoice date, format YYYY-MM-DD if possible, otherwise as it appears on the invoice)
- invoiceNumber (string, the primary invoice number or identifier)
- partyName (string, the name of the vendor, supplier, or main client on the invoice)
- particulars (string, a brief description of the main goods or services listed on this specific invoice. If multiple line items, provide a concise summary or the most significant item. Example: "Software Development Services" or "Office Supplies Purchase")
- taxableAmount (number, the total taxable amount before VAT or other taxes. THIS MUST BE A PLAIN NUMBER WITHOUT ANY CURRENCY SYMBOLS, COMMAS, OR TEXT. Example: 1100.00)
- vatAmount (number, the total VAT amount. THIS MUST BE A PLAIN NUMBER. Example: 134.50)
- totalAmount (number, the grand total amount of that specific invoice (taxableAmount + vatAmount + other charges if any). THIS MUST BE A PLAIN NUMBER. Example: 1234.56)

If a piece of information (like taxableAmount or vatAmount) is not clearly available for a specific invoice, use 0 for that numeric field within that invoice's object. For strings like date, invoiceNumber, partyName, or particulars, use "N/A" if not found.
Return ALL extracted invoices as a single JSON ARRAY. Each element in the array should be a JSON OBJECT representing one distinct invoice.

Example of desired JSON output structure if TWO invoices are found in the document:
[
  {
    "date": "2024-07-20",
    "invoiceNumber": "INV-XYZ-001",
    "partyName": "Example Vendor Inc.",
    "particulars": "Cloud Hosting Services Q3",
    "taxableAmount": 1400.00,
    "vatAmount": 175.50,
    "totalAmount": 1575.50
  },
  {
    "date": "2024-07-22",
    "invoiceNumber": "INV-ABC-002",
    "partyName": "Another Supplier LLC",
    "particulars": "Annual Software Subscription",
    "taxableAmount": 750.00,
    "vatAmount": 100.00,
    "totalAmount": 850.00
  }
]
If only one invoice is found, the array will contain a single object. If no invoices are found, return an empty array [].
Do NOT include any introductory text, explanations, or apologies in your response. Ensure the output is ONLY the JSON array of invoice objects.
`;

    const extractedDataArray = await getInvoiceDetailsFromFileViaGemini(
      extractionPrompt,
      filePart.inlineData.mimeType,
      filePart.inlineData.data
    );

    if (!extractedDataArray || !Array.isArray(extractedDataArray)) { 
        throw new Error("Gemini did not return data in the expected array format.");
    }

    if (extractedDataArray.length === 0) {
        return {
            fileName: file.name,
            items: [],
        };
    }
    
    const invoiceItems: InvoiceItem[] = extractedDataArray.map((rawSummary, index) => {
      // Basic validation for each summary item from Gemini
      if (typeof rawSummary.totalAmount === 'undefined' && typeof rawSummary.partyName === 'undefined' && typeof rawSummary.invoiceNumber === 'undefined' && typeof rawSummary.date === 'undefined') {
          console.warn(`Invoice summary at index ${index} from file ${file.name} is empty or malformed. Skipping.`);
      }
      return {
        id: `${file.name}-${Date.now()}-item-${index}`, // Unique ID for each item
        date: String(rawSummary.date || 'N/A'),
        invoiceNumber: String(rawSummary.invoiceNumber || 'N/A'),
        partyName: String(rawSummary.partyName || 'N/A'),
        particulars: String(rawSummary.particulars || 'N/A'), 
        taxableAmount: Number(rawSummary.taxableAmount || 0), 
        vatAmount: Number(rawSummary.vatAmount || 0),     
        totalAmount: Number(rawSummary.totalAmount || 0), 
        sourceFileName: file.name,
      };
    }).filter(item => !(item.date === 'N/A' && item.invoiceNumber === 'N/A' && item.partyName === 'N/A' && item.particulars === 'N/A' && item.totalAmount === 0 && item.taxableAmount === 0 && item.vatAmount === 0)); // Filter out completely empty items

    return {
      fileName: file.name,
      items: invoiceItems, 
    };

  } catch (error) {
    console.error('Error during actual invoice data extraction:', error);
    if (error instanceof Error) {
        throw new Error(`Failed to extract data from invoice document '${file.name}': ${error.message}`);
    }
    throw new Error(`An unknown error occurred during invoice document processing for '${file.name}'.`);
  }
};


// --- Original Mock Invoice Parser (Kept for reference or fallback) ---
const generateMockInvoiceItems = (fileName: string): InvoiceItem[] => {
  const baseDetails: Omit<InvoiceItem, 'id' | 'invoiceNumber' | 'partyName' | 'taxableAmount' | 'vatAmount' | 'totalAmount' | 'particulars'>[] = [
    { date: '2024-07-10'},
    { date: '2024-07-12'},
  ];

  const initialTotalAmounts = [157.50, 523.95, 525.00, 231.00, 79.28];
  const partyNames = ['Alpha Corp', 'Beta LLC', 'Gamma Solutions', 'Delta Inc.', 'Epsilon Co.'];
  
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash << 5) - hash + fileName.charCodeAt(i);
    hash |= 0; 
  }

  const baseItem = baseDetails[Math.abs(hash) % baseDetails.length];
  const partyIndex = (Math.abs(hash)) % partyNames.length;
  const invNumSuffix = (Math.abs(hash) % 1000) + 100;
  const totalAmount = initialTotalAmounts[Math.abs(hash) % initialTotalAmounts.length] + (Math.abs(hash % 20) -10);
  const taxableAmount = totalAmount / 1.05; // Assuming 5% VAT for mock
  const vatAmount = totalAmount - taxableAmount;


  return [{
      date: baseItem.date,
      particulars: "Mock Particulars", // Mock for summary
      id: `${fileName}-${Math.random().toString(36).substring(7)}-summary`,
      invoiceNumber: `INV-${invNumSuffix}`,
      partyName: partyNames[partyIndex],
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    }];
};

export const parseInvoice = (file: File): Promise<ParsedInvoice> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("File size exceeds 5MB limit."));
        return;
      }
      if (file.name.toLowerCase().includes("errorfile")) {
         reject(new Error("Simulated parsing error for invoice containing 'errorfile'."));
         return;
      }
      const mockItems = generateMockInvoiceItems(file.name);
      resolve({
        fileName: file.name,
        items: mockItems,
      });
    }, 700 + Math.random() * 800); 
  });
};