
import React from 'react';
import { InvoiceItem } from '../types';

interface InvoiceTableProps {
  items: InvoiceItem[];
  onVatCreditChange: (itemId: string, checked: boolean) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ items, onVatCreditChange }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-slate-400 py-4">No invoice items to display.</p>;
  }

  const formatNumber = (amount: number | undefined) => {
    if (amount === null || typeof amount === 'undefined') return '0';
    return amount.toString();
  };

  const handleCheckboxChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    onVatCreditChange(itemId, e.target.checked);
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full divide-y divide-slate-700 bg-slate-800">
        <thead className="bg-slate-700/50">
          <tr>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Date</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Invoice No.</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Party Name</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">PAN/VAT No.</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Particulars</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">Taxable Amt.</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">VAT Amt.</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">Total Amt.</th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-sky-300">VAT Credit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-700/70 transition-colors duration-150">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">{item.date}</td>
              <td 
                className="whitespace-nowrap px-4 py-3 text-sm text-slate-300"
                title={item.sourceFileName ? `From: ${item.sourceFileName}` : 'Invoice Number'}
              >
                {item.invoiceNumber}
              </td>
              <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-xs" title={item.partyName}>{item.partyName}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300" title={item.panOrVatNumber}>{item.panOrVatNumber}</td>
              <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-md" title={item.particulars}>{item.particulars}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300 text-right">{formatNumber(item.taxableAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300 text-right">{formatNumber(item.vatAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-cyan-400 text-right">{formatNumber(item.totalAmount)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-300 text-center">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-500 text-sky-500 focus:ring-sky-400 bg-slate-700 cursor-pointer"
                  checked={!!item.vatCredit}
                  onChange={(e) => handleCheckboxChange(item.id, e)}
                  aria-label={`Mark invoice ${item.invoiceNumber} for VAT credit`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};