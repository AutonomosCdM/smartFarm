'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  data: Record<string, unknown>[];
  xAxis: string;
  yAxis: string[];
  title?: string;
  colors?: string[];
}

interface ChartViewerProps {
  content: string;
  status: 'idle' | 'streaming' | 'complete' | 'error';
}

const DEFAULT_COLORS = [
  '#10b981', // green-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

export function ChartViewer({ content, status }: ChartViewerProps) {
  const chartConfig = useMemo<ChartConfig | null>(() => {
    try {
      if (!content || content.trim() === '') {
        return null;
      }
      return JSON.parse(content) as ChartConfig;
    } catch (error) {
      console.error('Error parsing chart config:', error);
      return null;
    }
  }, [content]);

  if (!chartConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">
          {status === 'streaming' ? 'Generando gráfico...' : 'Configuración de gráfico inválida'}
        </div>
      </div>
    );
  }

  const { type, data, xAxis, yAxis, colors = DEFAULT_COLORS } = chartConfig;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
        <XAxis
          dataKey={xAxis}
          className="text-sm"
          tick={{ fill: '#6b7280' }}
        />
        <YAxis className="text-sm" tick={{ fill: '#6b7280' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
          }}
        />
        <Legend />
      </>
    );

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {axes}
            {yAxis.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {axes}
            {yAxis.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {axes}
            {yAxis.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      default:
        return <div className="text-gray-500">Tipo de gráfico no soportado</div>;
    }
  };

  return (
    <div className="h-full w-full p-6 bg-white">
      {chartConfig.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {chartConfig.title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height="90%">
        {renderChart()}
      </ResponsiveContainer>
      {status === 'streaming' && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          Generando...
        </div>
      )}
    </div>
  );
}
