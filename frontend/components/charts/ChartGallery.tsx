'use client'
import { useEffect, useState } from 'react'
import { ChartImageCard } from './ChartImageCard'
import { getVisualizations } from '@/lib/api'
import { ChartResponse } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  sessionId: string
}

export function ChartGallery({ sessionId }: Props) {
  const [charts, setCharts] = useState<ChartResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!sessionId) return
    
    getVisualizations(sessionId)
      .then(data => {
        // Sort by sort_order
        const sorted = [...data.charts].sort((a, b) => a.sort_order - b.sort_order)
        setCharts(sorted)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-[280px] w-full rounded-none" />
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <span className="text-4xl">⚠️</span>
        <p className="font-medium">Could not load charts</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-primary underline underline-offset-4"
        >
          Retry
        </button>
      </div>
    )
  }
  
  if (charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <span className="text-4xl">📊</span>
        <p className="font-medium">No charts available</p>
        <p className="text-sm">Charts could not be generated for this dataset.</p>
      </div>
    )
  }
  
  // Full-width chart types (they need more horizontal space)
  const FULL_WIDTH_TYPES = ['heatmap', 'cluster_scatter', 'box_plots', 'line_trend']
  
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {charts.length} chart{charts.length !== 1 ? 's' : ''} generated
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map(chart => (
          <div
            key={chart.chart_id}
            className={FULL_WIDTH_TYPES.includes(chart.type) ? 'md:col-span-2' : ''}
          >
            <ChartImageCard chart={chart} />
          </div>
        ))}
      </div>
    </div>
  )
}
