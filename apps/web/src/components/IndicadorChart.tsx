'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  valor: number;
  meta: number;
  isOnTarget: boolean;
}

interface IndicadorChartProps {
  data: ChartDataPoint[];
  metaLine: number | null;
  unidadeMedida?: string;
}

export function IndicadorChart({ data, metaLine, unidadeMedida = '' }: IndicadorChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
          }}
          formatter={(value: number, name: string) => [
            `${value}${unidadeMedida}`,
            name === 'valor' ? 'Realizado' : 'Meta',
          ]}
        />
        {metaLine != null && (
          <ReferenceLine
            y={metaLine}
            stroke="#3b82f6"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: `Meta: ${metaLine}`,
              position: 'insideTopRight',
              fill: '#3b82f6',
              fontSize: 11,
            }}
          />
        )}
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isOnTarget ? '#22c55e' : '#ef4444'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="meta"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          legendType="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
