import { useCallback, useState } from 'react'
import { moveArrayItem } from '../../lib/reorderArray'

type Props = {
  images: string[]
  onChange: (images: string[]) => void
  onRemove: (url: string) => void
  disabled?: boolean
}

export default function PropertyPhotoReorderGrid({ images, onChange, onRemove, disabled = false }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const move = useCallback(
    (from: number, to: number) => {
      onChange(moveArrayItem(images, from, to))
    },
    [images, onChange],
  )

  const clearDrag = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  if (images.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        The first photo is your listing cover. Drag photos to reorder, or use the arrows on each image.
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => {
          const isCover = index === 0
          const isDragTarget = dropIndex === index && dragIndex !== null && dragIndex !== index
          return (
            <div
              key={url}
              draggable={!disabled}
              onDragStart={(e) => {
                if (disabled) return
                setDragIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(index))
              }}
              onDragEnd={clearDrag}
              onDragOver={(e) => {
                if (disabled || dragIndex === null) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDropIndex(index)
              }}
              onDragLeave={() => {
                setDropIndex((prev) => (prev === index ? null : prev))
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (disabled || dragIndex === null) return
                move(dragIndex, index)
                clearDrag()
              }}
              className={[
                'group relative flex w-28 flex-col overflow-hidden rounded-lg border bg-gray-100',
                disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing',
                isDragTarget ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-gray-200',
              ].join(' ')}
            >
              <div className="relative h-24 w-full overflow-hidden">
                <img src={url} alt="" className="h-full w-full object-cover pointer-events-none" draggable={false} />
                {isCover && (
                  <span className="absolute left-1 top-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void onRemove(url)}
                  disabled={disabled}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
              <div className="flex border-t border-gray-200 bg-white">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  className="flex flex-1 items-center justify-center py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move photo earlier"
                >
                  <span aria-hidden>←</span>
                </button>
                <span className="w-px bg-gray-200" aria-hidden />
                <button
                  type="button"
                  disabled={disabled || index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                  className="flex flex-1 items-center justify-center py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move photo later"
                >
                  <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
