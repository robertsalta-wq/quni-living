import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { adminTableWrapClass, adminTdClass, adminThClass, formatDate } from './adminUi'

type KnowledgeEntry = {
  id: string
  title: string
  content: string
  category: string
  state: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES = ['tenancy_law', 'platform_policy', 'suburb_guide', 'disclaimer'] as const

const emptyForm = {
  title: '',
  content: '',
  category: 'tenancy_law',
  state: '',
}

export default function KnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const authHeader = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? `Bearer ${token}` : null
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const h = await authHeader()
    if (!h) {
      setError('You need to be signed in.')
      setLoading(false)
      return
    }
    const res = await fetch(apiUrl('/api/admin/knowledge'), { headers: { Authorization: h } })
    const json = (await res.json()) as { entries?: KnowledgeEntry[]; error?: string }
    if (!res.ok) {
      setError(json.error || 'Could not load knowledge base.')
      setEntries([])
    } else {
      setEntries(json.entries ?? [])
    }
    setLoading(false)
  }, [authHeader])

  useEffect(() => {
    void load()
  }, [load])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  function startEdit(row: KnowledgeEntry) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      content: row.content,
      category: row.category,
      state: row.state ?? '',
    })
    setError(null)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!isSupabaseConfigured) return
    const h = await authHeader()
    if (!h) {
      setError('You need to be signed in.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, string | null | undefined> = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim(),
        state: form.state.trim() || null,
      }
      if (editingId) body.id = editingId

      const res = await fetch(apiUrl('/api/admin/knowledge'), {
        method: 'POST',
        headers: { Authorization: h, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { entry?: KnowledgeEntry; error?: string }
      if (!res.ok) {
        setError(json.error || 'Save failed.')
      } else if (json.entry) {
        setEntries((prev) => {
          const rest = prev.filter((x) => x.id !== json.entry!.id)
          return [json.entry!, ...rest].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          )
        })
        startCreate()
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this knowledge entry?')) return
    const h = await authHeader()
    if (!h) return
    setError(null)
    const res = await fetch(apiUrl('/api/admin/knowledge'), {
      method: 'DELETE',
      headers: { Authorization: h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      setError(json.error || 'Delete failed.')
      return
    }
    setEntries((prev) => prev.filter((x) => x.id !== id))
    if (editingId === id) startCreate()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Knowledge base</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        RAG chunks for the AI chat. Saving regenerates embeddings via OpenAI (requires{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> on Vercel).
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit entry' : 'New entry'}</h2>
            {editingId && (
              <button
                type="button"
                onClick={startCreate}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Cancel edit
              </button>
            )}
          </div>
          <form onSubmit={submitForm} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State (optional)</label>
              <input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="e.g. NSW — leave blank for national / platform"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
              <textarea
                required
                rows={12}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Update entry' : 'Create entry'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">All entries</h2>
          <div className={adminTableWrapClass}>
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={adminThClass}>Title</th>
                    <th className={adminThClass}>Category</th>
                    <th className={adminThClass}>State</th>
                    <th className={adminThClass}>Updated</th>
                    <th className={adminThClass} />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className={adminTdClass}>
                        <p className="font-medium text-gray-900 line-clamp-2">{row.title}</p>
                      </td>
                      <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>{row.category}</td>
                      <td className={`${adminTdClass} text-gray-600 whitespace-nowrap`}>{row.state ?? '—'}</td>
                      <td className={`${adminTdClass} text-gray-500 text-xs whitespace-nowrap`}>
                        {formatDate(row.updated_at)}
                      </td>
                      <td className={`${adminTdClass} text-right whitespace-nowrap`}>
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && entries.length === 0 && (
              <p className="p-8 text-sm text-gray-500 text-center">No entries yet. Run the seed script or create one.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
