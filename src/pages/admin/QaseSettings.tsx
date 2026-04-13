import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Json } from '../../lib/database.types'
import type { QaseField, QaseFieldType } from '../../types/qase'
import { adminCardClass, adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'

function asField(row: unknown): QaseField {
  return row as QaseField
}

function slugifyFieldKey(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return (s || 'field').slice(0, 80)
}

function optionsToCsv(opts: Json | null): string {
  if (opts == null) return ''
  if (Array.isArray(opts)) return opts.map((x) => String(x)).join(', ')
  return ''
}

function csvToOptionsJson(csv: string): Json | null {
  const arr = csv.split(',').map((s) => s.trim()).filter(Boolean)
  return arr.length > 0 ? arr : null
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
const btnPrimary =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50'
const btnSecondary =
  'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50'

export default function QaseSettings() {
  const [categories, setCategories] = useState<QaseField[]>([])
  const [priorities, setPriorities] = useState<QaseField[]>([])
  const [customFields, setCustomFields] = useState<QaseField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingCategoryLabelId, setEditingCategoryLabelId] = useState<string | null>(null)
  const [categoryLabelDraft, setCategoryLabelDraft] = useState('')

  const [editingPriorityLabelId, setEditingPriorityLabelId] = useState<string | null>(null)
  const [priorityLabelDraft, setPriorityLabelDraft] = useState('')

  const [editingCustomLabelId, setEditingCustomLabelId] = useState<string | null>(null)
  const [customLabelDraft, setCustomLabelDraft] = useState('')

  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatKey, setNewCatKey] = useState('')
  const newCatKeyTouchedRef = useRef(false)
  const [newCatSort, setNewCatSort] = useState(0)
  const [savingCategory, setSavingCategory] = useState(false)

  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [newCustomKey, setNewCustomKey] = useState('')
  const newCustomKeyTouchedRef = useRef(false)
  const [newCustomOptionsCsv, setNewCustomOptionsCsv] = useState('')
  const [newCustomSort, setNewCustomSort] = useState(0)
  const [savingCustom, setSavingCustom] = useState(false)

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured.')
      setCategories([])
      setPriorities([])
      setCustomFields([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: fetchErr } = await supabase.from('qase_fields').select('*').order('sort_order', { ascending: true })
    setLoading(false)
    if (fetchErr) {
      setError(fetchErr.message)
      return
    }
    const rows = (data ?? []).map(asField)
    setCategories(rows.filter((r) => r.field_type === 'category'))
    setPriorities(rows.filter((r) => r.field_type === 'priority'))
    setCustomFields(rows.filter((r) => r.field_type === 'custom'))
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const maxSortCategory = useMemo(
    () => (categories.length ? Math.max(...categories.map((c) => c.sort_order)) : 0),
    [categories],
  )
  const maxSortCustom = useMemo(
    () => (customFields.length ? Math.max(...customFields.map((c) => c.sort_order)) : 0),
    [customFields],
  )

  async function patchField(id: string, patch: Partial<QaseField>) {
    setError(null)
    const { error: upErr } = await supabase.from('qase_fields' as 'bookings').update(patch as never).eq('id', id)
    if (upErr) {
      setError(upErr.message)
      return
    }
    await loadAll()
  }

  async function updateCategoryLabel(id: string, label: string) {
    const t = label.trim()
    if (!t) return
    await patchField(id, { label: t })
    setEditingCategoryLabelId(null)
  }

  async function updatePriorityLabel(id: string, label: string) {
    const t = label.trim()
    if (!t) return
    await patchField(id, { label: t })
    setEditingPriorityLabelId(null)
  }

  async function updateCustomLabel(id: string, label: string) {
    const t = label.trim()
    if (!t) return
    await patchField(id, { label: t })
    setEditingCustomLabelId(null)
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault()
    const label = newCatLabel.trim()
    const key = newCatKey.trim() || slugifyFieldKey(label)
    if (!label || !key) return
    if (!isSupabaseConfigured) return
    setSavingCategory(true)
    setError(null)
    const { error: insErr } = await supabase.from('qase_fields' as 'bookings').insert({
      field_type: 'category' as QaseFieldType,
      field_key: key,
      label,
      sort_order: newCatSort,
      is_active: true,
      options: null,
    } as never)
    setSavingCategory(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setShowAddCategory(false)
    setNewCatLabel('')
    setNewCatKey('')
    newCatKeyTouchedRef.current = false
    await loadAll()
  }

  async function handleAddCustom(e: FormEvent) {
    e.preventDefault()
    const label = newCustomLabel.trim()
    const key = newCustomKey.trim() || slugifyFieldKey(label)
    if (!label || !key) return
    if (!isSupabaseConfigured) return
    setSavingCustom(true)
    setError(null)
    const opts = csvToOptionsJson(newCustomOptionsCsv)
    const { error: insErr } = await supabase.from('qase_fields' as 'bookings').insert({
      field_type: 'custom' as QaseFieldType,
      field_key: key,
      label,
      sort_order: newCustomSort,
      is_active: true,
      options: opts,
    } as never)
    setSavingCustom(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setShowAddCustom(false)
    setNewCustomLabel('')
    setNewCustomKey('')
    newCustomKeyTouchedRef.current = false
    setNewCustomOptionsCsv('')
    await loadAll()
  }

  async function deleteCustomField(id: string) {
    const row = customFields.find((c) => c.id === id)
    if (!row || row.is_active) return
    if (!window.confirm(`Delete custom field "${row.label}"? This cannot be undone.`)) return
    setError(null)
    const { error: delErr } = await supabase.from('qase_fields' as 'bookings').delete().eq('id', id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    await loadAll()
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Qase settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage support ticket categories, priorities, and custom fields</p>
        </div>
        <Link to="/admin/qase" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Support queue
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className={adminCardClass}>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Categories</h2>
            <p className="text-xs text-gray-500 mb-4">
              Deactivate instead of deleting — existing tickets keep their <code className="text-xs">field_key</code>{' '}
              values.
            </p>
            <div className={adminTableWrapClass}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={adminThClass}>Order</th>
                    <th className={adminThClass}>Label</th>
                    <th className={adminThClass}>Field key</th>
                    <th className={adminThClass}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((row) => (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <input
                          type="number"
                          className={`${inputClass} max-w-[5.5rem]`}
                          defaultValue={row.sort_order}
                          key={`${row.id}-sort-${row.sort_order}`}
                          onBlur={(e) => {
                            const n = Number(e.target.value)
                            if (!Number.isFinite(n) || n === row.sort_order) return
                            void patchField(row.id, { sort_order: n })
                          }}
                        />
                      </td>
                      <td className={adminTdClass}>
                        {editingCategoryLabelId === row.id ? (
                          <input
                            className={inputClass}
                            value={categoryLabelDraft}
                            onChange={(e) => setCategoryLabelDraft(e.target.value)}
                            onBlur={() => void updateCategoryLabel(row.id, categoryLabelDraft)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              if (e.key === 'Escape') {
                                setEditingCategoryLabelId(null)
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left font-medium text-indigo-700 hover:underline"
                            onClick={() => {
                              setEditingCategoryLabelId(row.id)
                              setCategoryLabelDraft(row.label)
                            }}
                          >
                            {row.label}
                          </button>
                        )}
                      </td>
                      <td className={`${adminTdClass} font-mono text-xs text-gray-600`}>{row.field_key}</td>
                      <td className={adminTdClass}>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={row.is_active}
                            onChange={(e) => void patchField(row.id, { is_active: e.target.checked })}
                          />
                          {row.is_active ? 'Yes' : 'No'}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAddCategory ? (
              <button
                type="button"
                className={`${btnPrimary} mt-4`}
                onClick={() => {
                  setNewCatLabel('')
                  setNewCatKey('')
                  newCatKeyTouchedRef.current = false
                  setNewCatSort(maxSortCategory + 10)
                  setShowAddCategory(true)
                }}
              >
                Add new category
              </button>
            ) : (
              <form onSubmit={(e) => void handleAddCategory(e)} className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Label *</label>
                  <input
                    className={inputClass}
                    value={newCatLabel}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewCatLabel(v)
                      if (!newCatKeyTouchedRef.current) setNewCatKey(slugifyFieldKey(v))
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Field key</label>
                  <input
                    className={`${inputClass} font-mono text-xs`}
                    value={newCatKey}
                    onChange={(e) => {
                      newCatKeyTouchedRef.current = true
                      setNewCatKey(e.target.value)
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Sort order</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newCatSort}
                    onChange={(e) => setNewCatSort(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingCategory} className={btnPrimary}>
                    {savingCategory ? 'Saving…' : 'Save category'}
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setShowAddCategory(false)
                      setNewCatLabel('')
                      setNewCatKey('')
                      newCatKeyTouchedRef.current = false
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className={adminCardClass}>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Priority labels</h2>
            <p className="text-xs text-gray-500 mb-4">
              Keys are fixed to match ticket priority values (<code className="text-xs">urgent</code>,{' '}
              <code className="text-xs">high</code>, <code className="text-xs">normal</code>, <code className="text-xs">low</code>).
            </p>
            <div className={adminTableWrapClass}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={adminThClass}>Order</th>
                    <th className={adminThClass}>Label</th>
                    <th className={adminThClass}>Field key (locked)</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((row) => (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <input
                          type="number"
                          className={`${inputClass} max-w-[5.5rem]`}
                          defaultValue={row.sort_order}
                          key={`${row.id}-p-sort-${row.sort_order}`}
                          onBlur={(e) => {
                            const n = Number(e.target.value)
                            if (!Number.isFinite(n) || n === row.sort_order) return
                            void patchField(row.id, { sort_order: n })
                          }}
                        />
                      </td>
                      <td className={adminTdClass}>
                        {editingPriorityLabelId === row.id ? (
                          <input
                            className={inputClass}
                            value={priorityLabelDraft}
                            onChange={(e) => setPriorityLabelDraft(e.target.value)}
                            onBlur={() => void updatePriorityLabel(row.id, priorityLabelDraft)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              if (e.key === 'Escape') setEditingPriorityLabelId(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left font-medium text-indigo-700 hover:underline"
                            onClick={() => {
                              setEditingPriorityLabelId(row.id)
                              setPriorityLabelDraft(row.label)
                            }}
                          >
                            {row.label}
                          </button>
                        )}
                      </td>
                      <td className={`${adminTdClass} font-mono text-xs text-gray-500`}>{row.field_key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={adminCardClass}>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Custom fields</h2>
            <p className="text-xs text-gray-500 mb-4">
              Options are stored as a JSON array (enter comma-separated values). Only inactive fields can be deleted.
            </p>
            <div className={adminTableWrapClass}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className={adminThClass}>Order</th>
                    <th className={adminThClass}>Label</th>
                    <th className={adminThClass}>Field key</th>
                    <th className={adminThClass}>Options</th>
                    <th className={adminThClass}>Active</th>
                    <th className={adminThClass} />
                  </tr>
                </thead>
                <tbody>
                  {customFields.map((row) => (
                    <tr key={row.id}>
                      <td className={adminTdClass}>
                        <input
                          type="number"
                          className={`${inputClass} max-w-[5.5rem]`}
                          defaultValue={row.sort_order}
                          key={`${row.id}-c-sort-${row.sort_order}`}
                          onBlur={(e) => {
                            const n = Number(e.target.value)
                            if (!Number.isFinite(n) || n === row.sort_order) return
                            void patchField(row.id, { sort_order: n })
                          }}
                        />
                      </td>
                      <td className={adminTdClass}>
                        {editingCustomLabelId === row.id ? (
                          <input
                            className={inputClass}
                            value={customLabelDraft}
                            onChange={(e) => setCustomLabelDraft(e.target.value)}
                            onBlur={() => void updateCustomLabel(row.id, customLabelDraft)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              if (e.key === 'Escape') setEditingCustomLabelId(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left font-medium text-indigo-700 hover:underline"
                            onClick={() => {
                              setEditingCustomLabelId(row.id)
                              setCustomLabelDraft(row.label)
                            }}
                          >
                            {row.label}
                          </button>
                        )}
                      </td>
                      <td className={`${adminTdClass} font-mono text-xs text-gray-600`}>{row.field_key}</td>
                      <td className={adminTdClass}>
                        <input
                          className={inputClass}
                          defaultValue={optionsToCsv(row.options)}
                          key={`${row.id}-opts-${JSON.stringify(row.options)}`}
                          placeholder="option_a, option_b"
                          onBlur={(e) => {
                            const nextCsv = e.target.value.trim()
                            const prevCsv = optionsToCsv(row.options).trim()
                            if (nextCsv === prevCsv) return
                            void patchField(row.id, { options: csvToOptionsJson(nextCsv) })
                          }}
                        />
                      </td>
                      <td className={adminTdClass}>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={row.is_active}
                            onChange={(e) => void patchField(row.id, { is_active: e.target.checked })}
                          />
                          {row.is_active ? 'Yes' : 'No'}
                        </label>
                      </td>
                      <td className={adminTdClass}>
                        {!row.is_active ? (
                          <button type="button" className="text-xs font-semibold text-red-600 hover:text-red-800" onClick={() => void deleteCustomField(row.id)}>
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAddCustom ? (
              <button
                type="button"
                className={`${btnPrimary} mt-4`}
                onClick={() => {
                  setNewCustomLabel('')
                  setNewCustomKey('')
                  newCustomKeyTouchedRef.current = false
                  setNewCustomOptionsCsv('')
                  setNewCustomSort(maxSortCustom + 10)
                  setShowAddCustom(true)
                }}
              >
                Add custom field
              </button>
            ) : (
              <form onSubmit={(e) => void handleAddCustom(e)} className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Label *</label>
                  <input
                    className={inputClass}
                    value={newCustomLabel}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewCustomLabel(v)
                      if (!newCustomKeyTouchedRef.current) setNewCustomKey(slugifyFieldKey(v))
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Field key</label>
                  <input
                    className={`${inputClass} font-mono text-xs`}
                    value={newCustomKey}
                    onChange={(e) => {
                      newCustomKeyTouchedRef.current = true
                      setNewCustomKey(e.target.value)
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Options (CSV)</label>
                  <input
                    className={inputClass}
                    value={newCustomOptionsCsv}
                    onChange={(e) => setNewCustomOptionsCsv(e.target.value)}
                    placeholder="Option A, Option B"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Sort order</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={newCustomSort}
                    onChange={(e) => setNewCustomSort(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingCustom} className={btnPrimary}>
                    {savingCustom ? 'Saving…' : 'Save field'}
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setShowAddCustom(false)
                      setNewCustomLabel('')
                      setNewCustomKey('')
                      newCustomKeyTouchedRef.current = false
                      setNewCustomOptionsCsv('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
