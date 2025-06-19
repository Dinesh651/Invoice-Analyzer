
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { InvoiceItem, GeminiModel } from '../types'; // InvoiceItem is used for the generateInvoiceInsights, not directly for raw extraction here

// API_KEY is expected to be set by the script in index.html for this playground,
// or by actual environment variables in a deployed application.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
let apiKeyInitializationError: string | null = null;

if (!API_KEY) {
  apiKeyInitializationError = "Gemini API Key not found. Please ensure API_KEY is set (e.g. in environment variables or the index.html script for this demo).";
  console.error(apiKeyInitializationError);
} else {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    apiKeyInitializationError = `Error initializing GoogleGenAI: ${ (e as Error).message }. Please check your API_KEY.`;
    console.error(apiKeyInitializationError);
    ai = null; 
  }
}

// Type for the raw data expected from Gemini for a single invoice summary
export interface RawInvoiceSummaryFromGemini {
  date?: string; // Optional because Gemini might not find it
  invoiceNumber?: string;
  partyName?: string;
  panOrVatNumber?: string; // New field for Seller's PAN/VAT
  particulars?: string;   // Added for extracted particulars
  taxableAmount?: number; // Expecting a number
  vatAmount?: number;     // Expecting a number
  totalAmount?: number; // Expecting a number directly from Gemini
}


export const getInvoiceDetailsFromFileViaGemini = async (
  userPrompt: string, 
  mimeType: string,
  fileBase64: string
): Promise<RawInvoiceSummaryFromGemini[]> => { 
  if (apiKeyInitializationError || !ai) {
    throw new Error(apiKeyInitializationError || "Gemini API client is not initialized. Check API_KEY.");
  }
  if (!fileBase64 || !mimeType) {
    throw new Error("File data or MIME type is missing for Gemini processing.");
  }

  const model = GeminiModel.GEMINI_FLASH;

  const filePart = {
    inlineData: {
      mimeType: mimeType,
      data: fileBase64,
    },
  };
  const textPart = { text: userPrompt };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [textPart, filePart] },
      config: {
        responseMimeType: "application/json", // Request JSON output
        temperature: 0.1, // Lower temperature for more deterministic JSON output
        topK: 32,
        topP: 0.9,
      }
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr);
      
      // The prompt now strictly expects an array. If it's not an array,
      // it's a deviation from the expected output format from Gemini.
      if (!Array.isArray(parsedData)) {
        console.error("Gemini response was not an array as expected by the prompt. Response:", parsedData, "Raw text:", response.text);
        throw new Error("Extracted data is not in the expected array format. The prompt requires Gemini to return a JSON array of invoice objects.");
      }
      // At this point, parsedData is an array. We assume its elements are intended to be RawInvoiceSummaryFromGemini.
      // Further validation of each object's structure (e.g., presence of totalAmount)
      // is handled in invoiceParserService when converting to InvoiceItem.
      return parsedData as RawInvoiceSummaryFromGemini[];
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e, "Raw response text:", response.text);
      throw new Error(`Failed to parse structured data from Gemini's response. Ensure the model returns valid JSON matching the requested schema. Raw response: ${response.text.substring(0,1000)}`);
    }

  } catch (error) {
    console.error("Error calling Gemini API for file extraction:", error);
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("api_key") || error.message.toLowerCase().includes("permission denied")) {
            throw new Error("Gemini API Key is not valid, missing, or lacks permissions. Please check your API_KEY configuration and ensure it's enabled for the Gemini API.");
        }
         throw new Error(`Gemini API request failed for file extraction: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API for file extraction.");
  }
};


// Existing function for text-based insights on ALREADY parsed data
export const generateInvoiceInsights = async (
  userPrompt: string,
  invoiceData: InvoiceItem[] // This now receives InvoiceItem summaries
): Promise<string> => {
  if (apiKeyInitializationError || !ai) {
    throw new Error(apiKeyInitializationError || "Gemini API client is not initialized. Check API_KEY.");
  }
  if (!invoiceData || invoiceData.length === 0) {
    return "No invoice data provided to analyze.";
  }

  const model = GeminiModel.GEMINI_FLASH;

  // Data summary now reflects that each item is an invoice total
  const dataSummary = invoiceData.map(item => ({
    source_file: item.sourceFileName,
    date: item.date,
    invoice_number: item.invoiceNumber,
    party: item.partyName,
    pan_or_vat_number: item.panOrVatNumber, // Added PAN/VAT
    particulars: item.particulars, 
    taxable_amount: item.taxableAmount, 
    vat_amount: item.vatAmount,         
    total_invoice_amount: item.totalAmount, 
  }));

  const fullPrompt = `
System: You are a helpful financial assistant. Analyze the provided INVOICE SUMMARIES based on the user's request.
Each item in the data represents a summary for a single invoice, including its date, invoice number, party name, seller's PAN/VAT number (pan_or_vat_number), particulars (description of goods/services), taxable amount, VAT amount, and total amount.
Provide clear, concise, and actionable insights. Format your response in markdown.

User Request: "${userPrompt}"

Invoice Summaries Data (JSON format):
\`\`\`json
${JSON.stringify(dataSummary, null, 2)}
\`\`\`
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for insights:", error);
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("api_key") || error.message.toLowerCase().includes("permission denied")) {
            throw new Error("Gemini API Key is not valid, missing, or lacks permissions. Please check your API_KEY environment variable and ensure it's enabled for the Gemini API.");
        }
         throw new Error(`Gemini API request failed for insights: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API for insights.");
  }
};