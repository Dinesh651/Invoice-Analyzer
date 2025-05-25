
import React from 'react';
import { InvoiceItem } from '../types';

interface InvoiceTableProps {
  items: InvoiceItem[];
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-slate-400 py-4">No invoice items to display.</p>;
  }

  // Displays amount as a plain number string, without currency symbols or specific locale formatting.
  const formatNumber = (amount: number | undefined) => {
    if (amount === null || typeof amount === 'undefined') return '0';
    return amount.toString();
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full divide-y divide-slate-700 bg-slate-800">
        <thead className="bg-slate-700/50">
          <tr>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Date</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Invoice No.</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Party Name</th>
            <th scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-sky-300">Particulars</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">Taxable Amt.</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">VAT Amt.</th>
            <th scope="col" className="px-4 py-3.5 text-right text-sm font-semibold text-sky-300">Total Amt.</th>
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
              <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-sm" title={item.partyName}>{item.partyName}</td>
              <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-md" title={item.particulars}>{item.particulars}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300 text-right">{formatNumber(item.taxableAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300 text-right">{formatNumber(item.vatAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-cyan-400 text-right">{formatNumber(item.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};