'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, MoreVertical, Loader2 } from 'lucide-react'
import { HistoryItem } from '@/lib/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  item: HistoryItem
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onStar: (id: string, starred: boolean) => void
}

export default function HistoryCard({ item, onDelete, onRename, onStar }: Props) {
  const router = useRouter()
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [newName, setNewName] = useState(item.display_name ?? item.original_name ?? '')

  const handleRenameSubmit = () => {
    onRename(item.session_id, newName)
    setIsRenameOpen(false)
  }

  // Determine status badge UI
  let statusBadge = null
  if (item.status === 'DONE') {
    statusBadge = <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-transparent">Done</Badge>
  } else if (item.status === 'FAILED') {
    statusBadge = <Badge variant="destructive">Failed</Badge>
  } else {
    statusBadge = (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Processing...
      </Badge>
    )
  }

  return (
    <div className="group border rounded-xl p-4 sm:p-5 bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        
        {/* Left: Star & Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onClick={() => onStar(item.session_id, !item.is_starred)}
            className="mt-1 flex-shrink-0 focus:outline-none focus-visible:ring-2 rounded-sm"
          >
            {item.is_starred ? (
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ) : (
              <Star className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-lg">
              {item.effective_name}
            </h3>
            <div className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-2">
              <span>original: {item.original_name || 'Unknown'}</span>
              <span>&middot;</span>
              <span>{new Date(item.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>

            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <span className="bg-muted px-2 py-0.5 rounded-full">{item.row_count?.toLocaleString() || 0} rows</span>
              <span>&middot;</span>
              <span className="bg-muted px-2 py-0.5 rounded-full">{item.col_count || 0} cols</span>
              <span>&middot;</span>
              <span className="bg-muted px-2 py-0.5 rounded-full">{item.insight_count} insights</span>
              <span>&middot;</span>
              <span className="bg-muted px-2 py-0.5 rounded-full">{item.chart_count} charts</span>
              {item.has_forecast && (
                <>
                  <span>&middot;</span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    📈 Forecast
                  </span>
                </>
              )}
            </div>

            {item.preferences_summary && (
              <div className="mt-2 text-xs text-muted-foreground/80 line-clamp-1">
                {item.preferences_summary}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div>{statusBadge}</div>
          
          <div className="flex items-center gap-2 mt-auto pt-2">
            <Button 
              size="sm" 
              onClick={() => router.push(`/dashboard/${item.session_id}`)}
              className="px-4"
            >
              Open Analysis
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "icon", className: "w-8 h-8" })}>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStar(item.session_id, !item.is_starred)}>
                  {item.is_starred ? 'Unstar' : 'Star'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <AlertDialog>
                  <AlertDialogTrigger className="w-full text-left">
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()} 
                      className="text-destructive focus:text-destructive w-full cursor-pointer"
                    >
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{item.effective_name}" and all its
                      charts, insights, and files. This cannot be undone.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2 mt-4">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(item.session_id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete permanently
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogTitle>Rename Analysis</DialogTitle>
          <div className="py-4 space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Q3 Sales Data"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
              <Button onClick={handleRenameSubmit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
