
import React, { useState, useCallback } from 'react';
import { InvoiceItem } from '../types';
import { generateInvoiceInsights } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
// import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon'; // Not used

interface GeminiInterfaceProps {
  invoiceItems: InvoiceItem[]; // These are now InvoiceItem summaries with taxable/VAT and particulars
}

export const GeminiInterface: React.FC<GeminiInterfaceProps> = ({ invoiceItems }) => {
  const [prompt, setPrompt] = useState<string>('Summarize total spending by party name, including total taxable, VAT amounts, and common particulars.');
  const [geminiResponse, setGeminiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = useCallback(async () => {
    if (!prompt.trim() || invoiceItems.length === 0) {
      setError('Please enter a prompt and ensure invoice data is loaded.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeminiResponse('');
    try {
      const insights = await generateInvoiceInsights(prompt, invoiceItems);
      setGeminiResponse(insights);
    } catch (err) {
      console.error("Error generating insights:", err);
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred while fetching insights.";
      setError(`Failed to get insights from Gemini. ${errorMessage}`);
      if (errorMessage.includes("API_KEY")) {
         setError("Gemini API Key not configured. Please ensure API_KEY is set in environment variables.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, invoiceItems]);

  const predefinedPrompts = [
    "What is the sum of total amounts, total taxable amounts, and total VAT amounts for all invoices?",
    "List total, taxable, VAT amounts, and particulars for each party name.",
    "Which invoice has the highest total VAT amount? What were its particulars?",
    "Calculate the average VAT percentage across all invoices (VAT Amount / Taxable Amount).",
    "Provide a brief overview of invoice values and common services/goods (particulars).",
    "Are there any recurring particulars or services across different invoices?"
  ];

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="gemini-prompt" className="block text-sm font-medium text-slate-300 mb-1">
          Your Question or Task for Gemini (based on extracted invoice summaries):
        </label>
        <textarea
          id="gemini-prompt"
          rows={3}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-sky-500 focus:border-sky-500 text-slate-200 placeholder-slate-400 disabled:opacity-50"
          placeholder="e.g., 'What is the total VAT collected?' or 'Common services provided?'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading || invoiceItems.length === 0}
        />
        {invoiceItems.length === 0 && <p className="text-sm text-amber-400 mt-1">Upload invoice(s) to enable AI insights.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {predefinedPrompts.map((p, index) => (
          <button
            key={index}
            onClick={() => setPrompt(p)}
            disabled={isLoading || invoiceItems.length === 0}
            className="px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-sky-300 rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={handleGenerateInsights}
        disabled={isLoading || !prompt.trim() || invoiceItems.length === 0}
        className="w-full flex items-center justify-center bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
            Processing...
          </>
        ) : (
          <>
            <SparklesIcon className="h-5 w-5 mr-2" />
            Ask Gemini
          </>
        )}
      </button>

      {error && <p className="text-red-400 text-center p-3 bg-red-900/30 rounded-md">{error}</p>}

      {geminiResponse && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-sky-400 mb-2">Gemini's Response:</h3>
          <pre className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed font-sans bg-slate-900/30 p-4 rounded-md overflow-x-auto">
            {geminiResponse}
          </pre>
        </div>
      )}
    </div>
  );
};