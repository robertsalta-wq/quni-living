import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { moveArrayItem } from '../../lib/reorderArray'
import {
  MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH,
  type PropertyImage,
} from '../../lib/propertyImages'

type Props = {
  images: PropertyImage[]
  onChange: (images: PropertyImage[]) => void
  onRemove: (url: string) => void
  disabled?: boolean
}

function PropertyPhotoTile({
  image,
  index,
  total,
  disabled,
  onRemove,
  onChange,
  move,
  dragIndex,
  dropIndex,
  setDragIndex,
  setDropIndex,
  clearDrag,
  images,
}: {
  image: PropertyImage
  index: number
  total: number
  disabled: boolean
  onRemove: (url: string) => void
  onChange: (images: PropertyImage[]) => void
  move: (from: number, to: number) => void
  dragIndex: number | null
  dropIndex: number | null
  setDragIndex: (index: number | null) => void
  setDropIndex: Dispatch<SetStateAction<number | null>>
  clearDrag: () => void
  images: PropertyImage[]
}) {
  const [loadFailed, setLoadFailed] = useState(false)
  const { url } = image
  const isCover = index === 0
  const isDragTarget = dropIndex === index && dragIndex !== null && dragIndex !== index

  const updateDescription = (description: string) => {
    const limited = description.slice(0, MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH)
    onChange(
      images.map((img, i) =>
        i === index ? { ...img, description: limited === '' ? undefined : limited } : img,
      ),
    )
  }

  const finalizeDescription = () => {
    const current = image.description
    if (current == null) return
    const trimmed = current.trim().slice(0, MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH)
    if (trimmed === current) return
    onChange(
      images.map((img, i) =>
        i === index ? { ...img, description: trimmed || undefined } : img,
      ),
    )
  }

  return (
    <div
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
        'group relative flex w-full max-w-[11rem] flex-col overflow-hidden rounded-lg border bg-gray-100 sm:w-44',
        disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing',
        isDragTarget ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-gray-200',
      ].join(' ')}
    >
      <div className="relative h-24 w-full overflow-hidden sm:h-28">
        {loadFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-stone-200 px-2 text-center text-[11px] font-medium text-stone-600">
            Missing photo
          </div>
        ) : (
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover pointer-events-none"
            draggable={false}
            onError={() => setLoadFailed(true)}
          />
        )}
        {isCover && (
          <span className="absolute left-1 top-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Cover
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(url)}
          disabled={disabled}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          aria-label="Remove photo"
        >
          ×
        </button>
      </div>
      <label className="sr-only" htmlFor={`photo-caption-${index}`}>
        Caption for photo {index + 1}
      </label>
      <input
        id={`photo-caption-${index}`}
        type="text"
        value={image.description ?? ''}
        onChange={(e) => updateDescription(e.target.value)}
        onBlur={finalizeDescription}
        disabled={disabled}
        placeholder="Caption (optional)"
        maxLength={MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH}
        className="w-full border-t border-gray-200 bg-white px-2 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:bg-gray-50"
      />
      <div className="flex border-t border-gray-200 bg-white">
        <button
          type="button"
          disabled={disabled || index === 0}
          onClick={() => move(index, index - 1)}
          className="flex flex-1 items-center justify-center py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move photo earlier"
        >
          <span aria-hidden>←</span>
        </button>
        <span className="w-px bg-gray-200" aria-hidden />
        <button
          type="button"
          disabled={disabled || index === total - 1}
          onClick={() => move(index, index + 1)}
          className="flex flex-1 items-center justify-center py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move photo later"
        >
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
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
        The first photo is your listing cover. Use ← → to reorder on phone, or drag on desktop. Add an optional
        caption for each photo (shown on the listing page).
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <PropertyPhotoTile
            key={image.url}
            image={image}
            index={index}
            total={images.length}
            disabled={disabled}
            onRemove={onRemove}
            onChange={onChange}
            move={move}
            dragIndex={dragIndex}
            dropIndex={dropIndex}
            setDragIndex={setDragIndex}
            setDropIndex={setDropIndex}
            clearDrag={clearDrag}
            images={images}
          />
        ))}
      </div>
    </div>
  )
}
