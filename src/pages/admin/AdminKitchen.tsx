import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  LoadingState,
  Pill,
  Sparkline,
} from '../../components/admin/primitives'

const SPARK_DATA = [4, 6, 5, 7, 9, 8, 12, 10, 13]

/**
 * Internal-only showcase for the admin design-system primitives.
 *
 * Reachable at `/admin/_kitchen` (no sidebar entry, no breadcrumb override).
 * Kept as a living reference for the design tokens / primitives now that the
 * Living Console is the default shell.
 */
export default function AdminKitchen() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Eyebrow tone="coral">Internal · Design system</Eyebrow>
        <h1 className="font-admin-display text-[32px] font-bold leading-tight tracking-tight text-admin-ink">
          Primitives kitchen
        </h1>
        <p className="max-w-[640px] text-[14px] text-admin-ink-4">
          Every primitive currently exported from{' '}
          <code className="rounded bg-admin-surface-3 px-1 py-0.5 text-[12px]">
            src/components/admin/primitives
          </code>
          . Kept as a living reference so new admin surfaces can lift the right pattern instead of
          inventing one.
        </p>
      </header>

      <KitchenSection title="Eyebrow">
        <div className="flex flex-col gap-2">
          <Eyebrow>Live operations · Sydney</Eyebrow>
          <Eyebrow tone="coral">Marketplace pulse · past 7 days</Eyebrow>
        </div>
      </KitchenSection>

      <KitchenSection title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button kind="primary" icon="plus">
            Primary
          </Button>
          <Button kind="secondary" icon="rotate-cw">
            Secondary
          </Button>
          <Button kind="ghost" iconRight="arrow-right">
            Ghost
          </Button>
          <Button kind="link" iconRight="arrow-up-right">
            Link button
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button kind="primary" size="sm">
            Small
          </Button>
          <Button kind="primary" size="md">
            Medium
          </Button>
          <Button kind="primary" size="lg">
            Large
          </Button>
          <Button kind="primary" disabled>
            Disabled
          </Button>
        </div>
      </KitchenSection>

      <KitchenSection title="Pills">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">Neutral</Pill>
          <Pill tone="coral">Coral</Pill>
          <Pill tone="navy">Navy</Pill>
          <Pill tone="success">Success</Pill>
          <Pill tone="warning">Warning</Pill>
          <Pill tone="danger">Danger</Pill>
          <Pill tone="info">Info</Pill>
          <Pill tone="ink">Ink</Pill>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill dot="critical" tone="danger">
            Critical
          </Pill>
          <Pill dot="action" tone="warning">
            Action
          </Pill>
          <Pill dot="watch" tone="navy">
            Watch
          </Pill>
          <Pill dot="ok" tone="success">
            All clear
          </Pill>
          <Pill icon="shield-check" tone="success">
            Verified
          </Pill>
          <Pill icon="tags" tone="coral">
            Listing tier
          </Pill>
        </div>
      </KitchenSection>

      <KitchenSection title="Sparklines">
        <Card>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Eyebrow>Bookings · 7d</Eyebrow>
              <p className="font-admin-display text-[26px] font-bold tracking-tight text-admin-ink tabular-nums">
                12
              </p>
              <Sparkline data={SPARK_DATA} color="coral" />
            </div>
            <div className="space-y-1">
              <Eyebrow>Trust checklist · 30d</Eyebrow>
              <p className="font-admin-display text-[26px] font-bold tracking-tight text-admin-ink tabular-nums">
                38%
              </p>
              <Sparkline data={[2, 3, 3, 5, 6, 8, 9, 11, 14]} color="navy" />
            </div>
          </div>
        </Card>
      </KitchenSection>

      <KitchenSection title="Card">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Eyebrow>Resting</Eyebrow>
            <p className="mt-1.5 text-[14px] text-admin-ink-3">
              Default card surface - 1px line, 16px radius, light shadow.
            </p>
          </Card>
          <Card hoverable>
            <Eyebrow>Hoverable</Eyebrow>
            <p className="mt-1.5 text-[14px] text-admin-ink-3">
              Hover this card to see the elevated shadow.
            </p>
          </Card>
        </div>
      </KitchenSection>

      <KitchenSection title="Canonical states">
        <div className="grid gap-4 md:grid-cols-3">
          <Card padding={0}>
            <EmptyState
              icon="inbox"
              title="No data yet"
              description="Nothing to show here. When activity starts arriving, it'll appear in this list."
              action={
                <Button kind="primary" icon="plus">
                  Add the first one
                </Button>
              }
            />
          </Card>
          <Card padding={0}>
            <LoadingState />
          </Card>
          <Card padding={0}>
            <ErrorState onRetry={() => window.location.reload()} />
          </Card>
        </div>
      </KitchenSection>
    </div>
  )
}

function KitchenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-admin-ink-4">
        {title}
      </h2>
      {children}
    </section>
  )
}
