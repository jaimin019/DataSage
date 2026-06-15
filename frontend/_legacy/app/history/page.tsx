'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Star, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HistoryCard from '@/components/history/HistoryCard'
import { getHistory, deleteSession, updateAnalysisLabel, HistoryItem } from '@/lib/api'

export default function HistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [starredOnly, setStarred] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setLoading] = useState(true)

  const loadHistory = async () => {
    try {
      setLoading(true)
      const res = await getHistory(page, 20, starredOnly)
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [page, starredOnly])

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id)
      setItems(items.filter(item => item.session_id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleRename = async (id: string, name: string) => {
    try {
      const updated = await updateAnalysisLabel(id, name, null)
      setItems(items.map(item => item.session_id === id ? updated : item))
    } catch (err) {
      console.error('Failed to rename:', err)
    }
  }

  const handleStar = async (id: string, is_starred: boolean) => {
    // Optimistic update
    setItems(items.map(item => item.session_id === id ? { ...item, is_starred } : item))
    try {
      const updated = await updateAnalysisLabel(id, null, is_starred)
      setItems(items => items.map(item => item.session_id === id ? updated : item))
    } catch (err) {
      // Revert on error
      setItems(items => items.map(item => item.session_id === id ? { ...item, is_starred: !is_starred } : item))
      console.error('Failed to star:', err)
    }
  }

  // Client-side search filtering
  const filtered = items.filter(item => {
    const name = item.effective_name || item.display_name || item.original_name || ""
    return !search || name.toLowerCase().includes(search.toLowerCase())
  })

  const starredCount = items.filter(i => i.is_starred).length

  if (!isLoading && items.length === 0 && !starredOnly && page === 1) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="text-6xl">📊</span>
          <h3 className="text-xl font-semibold text-foreground">No analyses yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm text-center">
            Upload your first CSV to get started. DataSage will automatically clean, analyze, and visualize your data.
          </p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Upload a CSV
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Analyses</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>{total} analyses</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {starredCount} starred
            </span>
          </p>
        </div>
        <Button onClick={() => router.push('/')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Upload New CSV
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-card"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant={starredOnly ? "secondary" : "outline"}
            className={`flex-1 sm:flex-none gap-2 ${starredOnly ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'bg-card'}`}
            onClick={() => {
              setStarred(true)
              setPage(1)
            }}
          >
            <Star className={`h-4 w-4 ${starredOnly ? 'fill-primary' : ''}`} /> Starred
          </Button>
          <Button 
            variant={!starredOnly ? "secondary" : "outline"}
            className={`flex-1 sm:flex-none ${!starredOnly ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'bg-card'}`}
            onClick={() => {
              setStarred(false)
              setPage(1)
            }}
          >
            All
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border rounded-xl bg-card/50 border-dashed">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No results found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => (
            <HistoryCard
              key={item.session_id}
              item={item}
              onDelete={handleDelete}
              onRename={handleRename}
              onStar={handleStar}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            &larr; Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next &rarr;
          </Button>
        </div>
      )}
    </div>
  )
}
