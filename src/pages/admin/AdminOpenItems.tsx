import { useMemo, useState } from 'react'
import {
  OPEN_ITEM_SECTIONS,
  OPEN_ITEMS,
  OPEN_ITEMS_DONE,
  OPEN_ITEMS_TECH_EMPTY_NOTE,
  openItemsForSection,
  priorityLabel,
  type OpenItem,
  type OpenItemPriority,
} from '../../lib/openItems'
import { adminTableWrapClass, adminTdClass, adminThClass } from './adminUi'
import { AdminPageHeader, Card, Pill } from '../../components/admin/primitives'

type TabId = 'open' | 'done'

function priorityPillTone(priority: OpenItemPriority): 'coral' | 'warning' | 'neutral' | 'info' {
  switch (priority) {
    case 'P0':
      return 'coral'
    case 'P1':
      return 'warning'
    case 'P2':
      return 'info'
    case 'P3':
      return 'neutral'
  }
}

function OpenItemsTable({ items }: { items: OpenItem[] }) {
  if (items.length === 0) return null
  return (
    <div className={adminTableWrapClass}>
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr>
            <th className={adminThClass}>ID</th>
            <th className={adminThClass}>What</th>
            <th className={adminThClass}>Why parked</th>
            <th className={adminThClass}>When to do</th>
            <th className={adminThClass}>Where</th>
            <th className={adminThClass}>Priority</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={adminTdClass}>
                <code className="rounded bg-admin-surface-3 px-1.5 py-0.5 text-[12px] font-semibold text-admin-ink-2">
                  {item.id}
                </code>
              </td>
              <td className={`${adminTdClass} max-w-[220px] font-medium text-admin-ink`}>{item.what}</td>
              <td className={`${adminTdClass} max-w-[200px] text-admin-ink-3`}>{item.whyParked}</td>
              <td className={`${adminTdClass} max-w-[200px] text-admin-ink-3`}>{item.whenToDo}</td>
              <td className={`${adminTdClass} max-w-[220px]`}>
                <span className="break-words font-mono text-[11px] text-admin-ink-4">{item.where}</span>
              </td>
              <td className={adminTdClass}>
                <Pill tone={priorityPillTone(item.priority)}>{priorityLabel(item.priority)}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminOpenItems() {
  const [tab, setTab] = useState<TabId>('open')
  const openCount = OPEN_ITEMS.length
  const doneCount = OPEN_ITEMS_DONE.length

  const sections = useMemo(
    () =>
      OPEN_ITEM_SECTIONS.map((section) => ({
        ...section,
        items: openItemsForSection(section.id),
      })),
    [],
  )

  return (
    <div className="mx-auto max-w-[1100px]">
      <AdminPageHeader
        title="Open items"
        subtitle="Deferred product decisions, tech debt, and ops follow-ups. Edit src/lib/openItems.ts (keep docs/open-items.md aligned)."
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="info">{openCount} open</Pill>
            <Pill tone="neutral">{doneCount} done</Pill>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 rounded-admin border border-admin-line bg-admin-surface-2 p-1 w-fit">
        {(
          [
            { id: 'open' as const, label: `Open (${openCount})` },
            { id: 'done' as const, label: `Done (${doneCount})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'rounded-admin-sm px-3 py-1.5 text-[13px] font-semibold transition-colors',
              tab === t.id
                ? 'bg-white text-admin-ink shadow-sm'
                : 'text-admin-ink-4 hover:text-admin-ink-2',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'open' ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <Card key={section.id} padding={20}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[16px] font-bold text-admin-ink">{section.label}</h2>
                  <p className="m-0 mt-0.5 text-[13px] text-admin-ink-4">{section.description}</p>
                </div>
                <Pill tone="neutral">{section.items.length}</Pill>
              </div>
              {section.items.length === 0 ? (
                <p className="m-0 text-[13px] leading-relaxed text-admin-ink-4">
                  {section.id === 'tech' ? OPEN_ITEMS_TECH_EMPTY_NOTE : 'No open items in this section.'}
                </p>
              ) : (
                <OpenItemsTable items={section.items} />
              )}
            </Card>
          ))}

          <Card padding={16}>
            <p className="m-0 text-[12px] leading-relaxed text-admin-ink-4">
              Adding items: give a stable ID, put the row in the right section, ship the code change with a docs update.
              Larger multi-PR work still gets a plan under <code className="text-[11px]">docs/plans/</code>.
            </p>
          </Card>
        </div>
      ) : (
        <Card padding={20}>
          <h2 className="m-0 mb-3 text-[16px] font-bold text-admin-ink">Done (recent)</h2>
          <div className={adminTableWrapClass}>
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={adminThClass}>ID</th>
                  <th className={adminThClass}>What</th>
                  <th className={adminThClass}>Closed</th>
                  <th className={adminThClass}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {OPEN_ITEMS_DONE.map((item) => (
                  <tr key={item.id}>
                    <td className={adminTdClass}>
                      <code className="rounded bg-admin-surface-3 px-1.5 py-0.5 text-[12px] font-semibold text-admin-ink-2">
                        {item.id}
                      </code>
                    </td>
                    <td className={`${adminTdClass} font-medium text-admin-ink`}>{item.what}</td>
                    <td className={adminTdClass}>{item.closed}</td>
                    <td className={`${adminTdClass} text-admin-ink-3`}>{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
