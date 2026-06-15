"use client";

import { useMemo } from "react";
import { HeatmapPoint, ChartConfig } from "@/lib/types";

interface CorrelationHeatmapProps {
  data: HeatmapPoint[];
  config: ChartConfig;
  title: string;
  description: string;
}

const getColor = (v: number): string => {
  if (v >= 0) return `rgba(99, 102, 241, ${v})`; // indigo
  return `rgba(239, 68, 68, ${Math.abs(v)})`; // red
};

export default function CorrelationHeatmap({ data, config }: CorrelationHeatmapProps) {
  const columns = useMemo(() => {
    if (config.columns && config.columns.length > 0) return config.columns;
    const cols = new Set<string>();
    data.forEach((d) => {
      cols.add(d.x);
      cols.add(d.y);
    });
    return Array.from(cols);
  }, [data, config.columns]);

  const valueMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      map.set(`${d.x}|${d.y}`, d.value);
    });
    return map;
  }, [data]);

  if (!data || data.length === 0 || columns.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
        No correlation data available
      </div>
    );
  }

  const cellSize = Math.min(60, Math.floor(400 / columns.length));
  const labelSpace = 100;
  const headerSpace = 80;
  const svgWidth = labelSpace + columns.length * cellSize + 20;
  const svgHeight = headerSpace + columns.length * cellSize + 60; // +60 for legend

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
      >
        {/* Column headers (rotated 45°) */}
        {columns.map((col, i) => (
          <text
            key={`header-${col}`}
            x={labelSpace + i * cellSize + cellSize / 2}
            y={headerSpace - 8}
            textAnchor="start"
            fontSize={Math.min(11, cellSize * 0.22)}
            fill="currentColor"
            className="text-foreground"
            transform={`rotate(-45, ${labelSpace + i * cellSize + cellSize / 2}, ${headerSpace - 8})`}
          >
            {col.length > 12 ? col.substring(0, 12) + "…" : col}
          </text>
        ))}

        {/* Row labels + cells */}
        {columns.map((rowCol, rowIdx) => (
          <g key={`row-${rowCol}`}>
            {/* Row label */}
            <text
              x={labelSpace - 8}
              y={headerSpace + rowIdx * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              fontSize={Math.min(11, cellSize * 0.22)}
              fill="currentColor"
              className="text-foreground"
            >
              {rowCol.length > 12 ? rowCol.substring(0, 12) + "…" : rowCol}
            </text>

            {/* Cells */}
            {columns.map((colCol, colIdx) => {
              const value = valueMap.get(`${colCol}|${rowCol}`) ?? valueMap.get(`${rowCol}|${colCol}`) ?? 0;
              const isDiagonal = rowIdx === colIdx;

              return (
                <g key={`cell-${rowIdx}-${colIdx}`}>
                  <rect
                    x={labelSpace + colIdx * cellSize}
                    y={headerSpace + rowIdx * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={isDiagonal ? "hsl(var(--muted))" : getColor(value)}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    rx={2}
                  >
                    <title>{`${colCol} ↔ ${rowCol}: ${value.toFixed(3)}`}</title>
                  </rect>
                  {!isDiagonal && Math.abs(value) > 0.2 && (
                    <text
                      x={labelSpace + colIdx * cellSize + cellSize / 2}
                      y={headerSpace + rowIdx * cellSize + cellSize / 2 + 4}
                      textAnchor="middle"
                      fontSize={Math.min(10, cellSize * 0.2)}
                      fontWeight="bold"
                      fill={Math.abs(value) > 0.5 ? "white" : "currentColor"}
                    >
                      {value.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Legend bar */}
        <defs>
          <linearGradient id="heatmapLegend" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 1)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 1)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 1)" />
          </linearGradient>
        </defs>
        <rect
          x={labelSpace}
          y={headerSpace + columns.length * cellSize + 15}
          width={columns.length * cellSize}
          height={12}
          fill="url(#heatmapLegend)"
          rx={4}
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
        />
        <text
          x={labelSpace}
          y={headerSpace + columns.length * cellSize + 42}
          fontSize={10}
          fill="currentColor"
          className="text-muted-foreground"
        >
          -1.0
        </text>
        <text
          x={labelSpace + (columns.length * cellSize) / 2}
          y={headerSpace + columns.length * cellSize + 42}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          className="text-muted-foreground"
        >
          0.0
        </text>
        <text
          x={labelSpace + columns.length * cellSize}
          y={headerSpace + columns.length * cellSize + 42}
          textAnchor="end"
          fontSize={10}
          fill="currentColor"
          className="text-muted-foreground"
        >
          +1.0
        </text>
      </svg>
    </div>
  );
}
