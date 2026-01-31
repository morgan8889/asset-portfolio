'use client';

/**
 * PDF-capturable performance report component
 * Fixed dimensions for consistent PDF output
 * @feature 011-export-functionality
 */

import type { PerformanceReportData } from '@/types/export';
import { format } from 'date-fns';

interface PerformanceReportProps {
  data: PerformanceReportData;
  chartImageUrl?: string;
  donutImageUrl?: string;
}

export function PerformanceReport({
  data,
  chartImageUrl,
  donutImageUrl,
}: PerformanceReportProps) {
  return (
    <div
      className="bg-white p-8"
      style={{ width: '210mm', minHeight: '297mm' }} // A4 size
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{data.portfolioName}</h1>
        <p className="text-gray-600">
          Performance Report | {format(data.generatedAt, 'MMMM d, yyyy')}
        </p>
        <p className="text-sm text-gray-500">
          Period: {format(data.dateRange.start, 'MMM d, yyyy')} -{' '}
          {format(data.dateRange.end, 'MMM d, yyyy')}
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Total Value</p>
          <p className="text-2xl font-bold">${data.summary.totalValue}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Total Cost</p>
          <p className="text-2xl font-bold">${data.summary.totalCost}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Total Gain/Loss</p>
          <p
            className={`text-2xl font-bold ${
              data.summary.totalGain.startsWith('-')
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            ${data.summary.totalGain} ({data.summary.totalGainPercent})
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Period Return</p>
          <p className="text-xl font-semibold">{data.summary.periodReturn}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Annualized Return</p>
          <p className="text-xl font-semibold">
            {data.summary.annualizedReturn}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      {(chartImageUrl || donutImageUrl) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Performance Charts</h2>
          <div className="grid grid-cols-2 gap-4">
            {chartImageUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Portfolio Value</p>
                <img
                  src={chartImageUrl}
                  alt="Portfolio Value Chart"
                  className="w-full"
                />
              </div>
            )}
            {donutImageUrl && (
              <div>
                <p className="text-sm font-medium mb-2">Asset Allocation</p>
                <img
                  src={donutImageUrl}
                  alt="Asset Allocation"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Holdings Table */}
      <div>
        <h2 className="text-xl font-bold mb-4">Top 10 Holdings</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">
                Symbol
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Name
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right">
                Value
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right">
                Weight
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right">
                Gain/Loss
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {data.topHoldings.map((holding, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {holding.symbol}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {holding.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  ${holding.value}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {holding.weight}
                </td>
                <td
                  className={`border border-gray-300 px-4 py-2 text-right ${
                    holding.gain.startsWith('-')
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  ${holding.gain}
                </td>
                <td
                  className={`border border-gray-300 px-4 py-2 text-right ${
                    holding.gainPercent.startsWith('-')
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {holding.gainPercent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
