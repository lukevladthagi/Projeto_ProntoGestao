'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MonthlyComparisonPoint {
  date: string;
  diferenca: number | null;
  variacao: number | null;
  isPositive: boolean;
}

interface YearComparisonPoint {
  year: string;
  valor: number;
  isCurrent: boolean;
}

interface IndicadorComparisonChartProps {
  monthlyData: MonthlyComparisonPoint[];
  yearlyData: YearComparisonPoint[];
  unidadeMedida?: string;
}

function formatValue(value: number | string | null | undefined) {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return numericValue % 1 === 0 ? String(numericValue) : numericValue.toFixed(2);
}

function formatPercent(value: number | string | null | undefined) {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return `${numericValue.toFixed(1)}%`;
}

export function IndicadorComparisonChart({
  monthlyData,
  yearlyData,
  unidadeMedida = '',
}: IndicadorComparisonChartProps) {
  const renderDifferenceLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (x == null || y == null || width == null || value == null) return null;

    return (
      <text
        x={x + width / 2}
        y={Number(value) >= 0 ? y - 8 : y + 18}
        textAnchor="middle"
        fill="#334155"
        fontSize={11}
        fontWeight={700}
      >
        {formatValue(value)}
      </text>
    );
  };

  const renderYearLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (x == null || y == null || width == null || value == null) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill="#334155"
        fontSize={12}
        fontWeight={700}
      >
        {formatValue(value)}
      </text>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Diferenca de resultado com o ano anterior
        </h3>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 28, right: 18, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                }}
                formatter={(value, name) => [
                  name === 'variacao'
                    ? formatPercent(value as number)
                    : `${formatValue(value as number)}${unidadeMedida}`,
                  name === 'variacao' ? 'Variacao' : 'Diferenca',
                ]}
              />
              <Bar yAxisId="left" dataKey="diferenca" radius={[4, 4, 0, 0]} barSize={38}>
                {monthlyData.map((entry, index) => (
                  <Cell key={`comparison-cell-${index}`} fill={entry.isPositive ? '#10b981' : '#ef4444'} />
                ))}
                <LabelList dataKey="diferenca" content={renderDifferenceLabel} />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="variacao"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Meta e resultado por ano</h3>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData} margin={{ top: 28, right: 12, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                }}
                formatter={(value) => [`${formatValue(value as number)}${unidadeMedida}`, 'Acumulado']}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={58}>
                {yearlyData.map((entry, index) => (
                  <Cell key={`year-cell-${index}`} fill={entry.isCurrent ? '#22c55e' : '#ef4444'} />
                ))}
                <LabelList dataKey="valor" content={renderYearLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
