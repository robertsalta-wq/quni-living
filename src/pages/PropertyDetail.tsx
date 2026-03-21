import { useParams } from 'react-router-dom'

export default function PropertyDetail() {
  const { slug } = useParams()

  return (
    <div className="p-8">
      <p className="text-gray-600 text-sm mb-2">Property</p>
      <h1 className="text-xl font-semibold text-gray-900">{slug ?? '—'}</h1>
    </div>
  )
}
