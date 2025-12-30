import React from "react";

/**
 * Unified LineItems Table Component
 * 
 * Renders line items with consistent layout:
 * - item_name always shown (bold, dark)
 * - description always shown below (light gray, smaller)
 * - Maintains exact current styling
 * 
 * @param {Array} items - Line items to render
 * @param {string} variant - 'quote' | 'invoice' | 'default'
 * @param {string} currency - Currency symbol (default: '$')
 * @param {boolean} showLineNumber - Show line numbers (default: true)
 */
export default function LineItemsTable({ 
  items = [], 
  variant = 'default',
  currency = '$',
  showLineNumber = true 
}) {
  const formatCurrency = (value) => {
    return `${currency}${(value || 0).toFixed(2)}`;
  };

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-100">
          {showLineNumber && (
            <th className="border-b-2 border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
              #
            </th>
          )}
          <th className="border-b-2 border-gray-300 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Item
          </th>
          <th className="border-b-2 border-gray-300 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-24">
            Qty
          </th>
          <th className="border-b-2 border-gray-300 px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-28">
            Rate
          </th>
          <th className="border-b-2 border-gray-300 px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-32">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} className="page-break-inside-avoid">
            {showLineNumber && (
              <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-700 align-top">
                {idx + 1}
              </td>
            )}
            <td className="border-b border-gray-200 px-4 py-3 align-top">
              {/* ALWAYS render item_name */}
              <div className="text-sm font-semibold text-gray-900">
                {item.item_name || <span className="text-gray-400">(No item selected)</span>}
              </div>
              {/* ALWAYS render description below */}
              <div className="text-xs text-gray-500 mt-0.5">
                {item.description || <span className="text-gray-400">-</span>}
              </div>
            </td>
            <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-700 text-center align-top">
              {item.quantity} {item.unit}
            </td>
            <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-700 text-right align-top">
              {formatCurrency(item.unit_price)}
            </td>
            <td className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 text-right align-top">
              {formatCurrency(item.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}