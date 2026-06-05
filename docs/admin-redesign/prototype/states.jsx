// Empty / loading / error states + simple stubs for other sidebar items.

function StatesPage({ active }) {
  // Pick which state to show based on the nav item.
  const map = {
    'tier-events':       { mode: 'empty',   title: 'Tier events' },
    'enquiries':         { mode: 'loading', title: 'Enquiries' },
    'properties':        { mode: 'empty',   title: 'Properties' },
    'active-tenancies':  { mode: 'empty',   title: 'Active tenancies' },
    'condition-reports': { mode: 'loading', title: 'Condition reports' },
    'landlords':         { mode: 'loading', title: 'Landlords' },
    'leads':             { mode: 'empty',   title: 'Landlord leads' },
    'payments':          { mode: 'error',   title: 'Payments' },
    'trust-checklist':   { mode: 'empty',   title: 'Trust checklist' },
    'state-workflows':   { mode: 'empty',   title: 'State workflows' },
    'documents':         { mode: 'empty',   title: 'Documents' },
    'apps':              { mode: 'empty',   title: 'Apps' },
    'domains':           { mode: 'empty',   title: 'Domains' },
    'kb':                { mode: 'loading', title: 'Knowledge base' },
    'qase':              { mode: 'empty',   title: 'Support (Qase)' },
    'business-settings': { mode: 'empty',   title: 'Business settings' },
  }[active] || { mode: 'empty', title: 'Page' };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.015em' }}>{map.title}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: C.ink4 }}>Demonstrating the system's canonical {map.mode} state.</p>
      </div>

      {/* State examples row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        <StateExample kind="empty"   highlighted={map.mode === 'empty'}/>
        <StateExample kind="loading" highlighted={map.mode === 'loading'}/>
        <StateExample kind="error"   highlighted={map.mode === 'error'}/>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: C.ink5 }}>
        All three states are quiet by design - text + a single Lucide glyph + a single action.
        No illustrations, no marketing copy.
      </p>
    </div>
  );
}
window.StatesPage = StatesPage;

function StateExample({ kind, highlighted }) {
  const frame = {
    background: '#fff',
    border: `1px solid ${highlighted ? C.coral : C.line}`,
    borderRadius: 16,
    boxShadow: highlighted ? '0 4px 12px rgba(255,111,97,.10), 0 1px 2px rgba(8,6,13,.05)' : '0 1px 2px rgba(8,6,13,.05)',
    padding: '40px 28px', minHeight: 280,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', position: 'relative',
  };
  return (
    <div style={frame}>
      {highlighted && (
        <span style={{
          position: 'absolute', top: 12, left: 12,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: C.coralActive, background: C.coralTint15,
          padding: '3px 8px', borderRadius: 999,
        }}>Showing now</span>
      )}
      <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink5 }}>
        {kind}
      </span>
      {kind === 'empty' && <EmptyState/>}
      {kind === 'loading' && <LoadingState/>}
      {kind === 'error' && <ErrorState/>}
    </div>
  );
}

function EmptyState() {
  return (
    <>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: C.s2,
        display: 'grid', placeItems: 'center', marginBottom: 14,
        border: `1px solid ${C.line}`,
      }}>
        <Icon name="inbox" size={20} color={C.ink4}/>
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.ink }}>No data yet</p>
      <p style={{ margin: '4px 0 16px', fontSize: 13, color: C.ink4, maxWidth: 280 }}>
        Nothing to show here. When activity starts arriving, it'll appear in this list.
      </p>
      <Button kind="primary" size="md" icon="plus">Add the first one</Button>
    </>
  );
}

function LoadingState() {
  return (
    <>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        border: `2px solid ${C.coralTint15}`,
        borderTopColor: C.coral,
        animation: 'qspin 800ms linear infinite',
        marginBottom: 16,
      }}/>
      <style>{`@keyframes qspin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.ink3 }}>Loading…</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: C.ink5 }}>Fetching live data</p>
    </>
  );
}

function ErrorState() {
  return (
    <>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: C.dangerBg,
        display: 'grid', placeItems: 'center', marginBottom: 14,
        border: '1px solid rgba(220,38,38,.18)',
      }}>
        <Icon name="alert-triangle" size={20} color={C.dangerFg}/>
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.ink }}>Couldn't load this</p>
      <p style={{ margin: '4px 0 16px', fontSize: 13, color: C.ink4, maxWidth: 280 }}>
        Try again, or contact support if it keeps happening.
      </p>
      <Button kind="secondary" size="md" icon="rotate-cw">Retry</Button>
    </>
  );
}
