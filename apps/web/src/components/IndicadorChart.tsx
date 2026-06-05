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
  LabelList,
  Legend,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  valor: number | null;
  meta: number;
  comparativo?: number | null;
  isOnTarget: boolean;
}

interface IndicadorChartProps {
  data: ChartDataPoint[];
  realizadoLabel?: string;
  comparativoLabel?: string;
  unidadeMedida?: string;
}

function formatChartValue(value: number | string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue % 1 === 0 ? String(numericValue) : numericValue.toFixed(2);
}

export function IndicadorChart({
  data,
  realizadoLabel = 'Realizado',
  comparativoLabel = 'Ano anterior',
  unidadeMedida = '',
}: IndicadorChartProps) {
  const hasComparativo = data.some((point) => point.comparativo != null);

  const renderBarBaseLabel = (props: any) => {
    const { x, y, width, height, value } = props;

    if (x == null || y == null || width == null || height == null || value == null) {
      return null;
    }

    const isTallBar = height >= 28;
    const labelY = isTallBar ? y + height - 10 : y - 8;

    return (
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fill={isTallBar ? '#ffffff' : '#334155'}
        fontSize={12}
        fontWeight={700}
        style={isTallBar ? { textShadow: '0 1px 2px rgba(15, 23, 42, 0.35)' } : undefined}
      >
        {formatChartValue(value)}
      </text>
    );
  };

  const renderMetaLabel = (props: any) => {
    const { x, y, value } = props;

    if (x == null || y == null || value == null) {
      return null;
    }

    return (
      <text x={x} y={y - 8} textAnchor="middle" fill="#0f172a" fontSize={12} fontWeight={700}>
        {formatChartValue(value)}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 34, right: 18, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf1" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 13, fill: '#64748b' }}
          axisLine={{ stroke: '#94a3b8' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 13, fill: '#64748b' }}
          axisLine={{ stroke: '#94a3b8' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
          }}
          formatter={(value, name) => [
            `${value}${unidadeMedida}`,
            name === 'valor'
              ? realizadoLabel
              : name === 'comparativo'
                ? comparativoLabel
                : 'Meta',
          ]}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconSize={12}
          wrapperStyle={{ fontSize: 14, paddingTop: 14 }}
        />
        <Line
          name="Meta"
          type="monotone"
          dataKey="meta"
          stroke="#0f172a"
          strokeWidth={2}
          dot={{ r: 4, fill: '#0f172a', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          legendType="line"
        >
          <LabelList dataKey="meta" content={renderMetaLabel} />
        </Line>
        <Bar name={realizadoLabel} dataKey="valor" radius={[4, 4, 0, 0]} barSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isOnTarget ? '#22c55e' : '#ef4444'}
              fillOpacity={0.85}
            />
          ))}
          <LabelList dataKey="valor" content={renderBarBaseLabel} />
        </Bar>
        {hasComparativo && (
          <Line
            name={comparativoLabel}
            type="monotone"
            dataKey="comparativo"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: '#64748b', strokeWidth: 0 }}
            connectNulls
            legendType="line"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
