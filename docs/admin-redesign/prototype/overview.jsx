// Overview - "The Living Console"
// Editorial hero, ATTENTION strip, 6 zones, Marketplace Pulse.

function OverviewPage({ onNavigate }) {
  const [range, setRange] = useState('7d');
  return (
    <div>
      <Hero range={range} setRange={setRange}/>
      <AttentionStrip onNavigate={onNavigate}/>
      <ZoneGrid onNavigate={onNavigate}/>
      <MarketplacePulse/>
    </div>
  );
}
window.OverviewPage = OverviewPage;

function Hero({ range, setRange }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{
              width: 40, height: 40, borderRadius: 10, background: C.coral,
              display: 'grid', placeItems: 'center', color: '#fff',
              fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22,
              letterSpacing: '-0.02em', lineHeight: 1,
              boxShadow: '0 1px 2px rgba(8,6,13,.08)',
            }}>Q</span>
            <Eyebrow>Live operations · Sydney</Eyebrow>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: 'clamp(44px, 5vw, 60px)', lineHeight: 1.05, letterSpacing: '-0.025em',
            color: C.ink, margin: 0,
          }}>
            The <em style={{ fontStyle: 'italic', fontWeight: 700 }}>Living</em> Console.
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <RangeToggle range={range} setRange={setRange}/>
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: C.ink3, textDecoration: 'none' }}>
            <Icon name="bookmark" size={13} color={C.ink4}/> Saved views
          </a>
          <Button kind="primary" size="md" icon="plus">Quick action</Button>
          <span style={{ width: 1, height: 22, background: C.line }}/>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: C.successBg, color: C.successFg, border: '1px solid rgba(15,110,86,.18)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: C.success }}/> Live
          </span>
          <button title="Notifications" style={{ position: 'relative', background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: C.ink3, borderRadius: 8 }}>
            <Icon name="bell" size={17}/>
            <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: C.coral, border: '1.5px solid #fff' }}/>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 999, border: `1px solid ${C.line}`, cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: C.navy, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>SA</div>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink2 }}>Sam</span>
            <Icon name="chevron-down" size={12} color={C.ink4}/>
          </div>
        </div>
      </div>
    </section>
  );
}

function RangeToggle({ range, setRange }) {
  const opts = [['today', 'Today'], ['7d', '7d']];
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 999, background: '#fff', border: `1px solid ${C.line}` }}>
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => setRange(k)} style={{
          padding: '4px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
          background: range === k ? C.ink : 'transparent',
          color: range === k ? '#fff' : C.ink3,
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        }}>{label}</button>
      ))}
    </div>
  );
}

function AttentionStrip({ onNavigate }) {
  const items = [
    { tone: 'critical', text: '4 pending bookings > 24h',          go: 'bookings' },
    { tone: 'action',   text: '3 landlord enquiries unanswered',   go: 'enquiries' },
    { tone: 'action',   text: '2 rent payments overdue',            go: 'payments' },
    { tone: 'watch',    text: '1 tenancy agreement unsigned',       go: 'documents' },
  ];
  return (
    <section style={{
      background: C.cream, border: `1px solid ${C.creamBorder}`, borderRadius: 12,
      padding: '12px 16px', marginBottom: 28,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 14, borderRight: `1px solid ${C.creamBorder}` }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink }}>Attention</span>
        <span style={{ fontSize: 12, color: C.ink3 }}>
          <strong style={{ color: C.ink }}>4 active</strong> · 1 critical, 2 action, 1 watch
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
        {items.map((it, i) => (
          <button key={i} onClick={() => onNavigate && onNavigate(it.go)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: `1px solid ${C.creamBorder}`, borderRadius: 999,
            padding: '5px 12px 5px 10px', fontSize: 12, fontWeight: 500, color: C.ink2,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: { critical: C.danger, action: C.warning, watch: C.navy }[it.tone] }}/>
            <span>{it.text}</span>
            <span style={{ color: C.coralActive, fontWeight: 600, marginLeft: 4 }}>Fix →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const ZONES = [
  {
    title: 'Marketplace', entry: 'bookings', eyebrow: 'Bookings · Enquiries', icon: 'home', iconTone: 'cream',
    spark: [4,3,5,4,7,6,9], sparkColor: C.coral,
    rows: [
      { tone: 'critical', text: '4 pending bookings > 24h' },
      { tone: 'action',   text: '12 open enquiries this week' },
      { tone: 'watch',    text: '3 listings unfulfilled' },
    ],
  },
  {
    title: 'Tenancies', entry: 'active-tenancies', eyebrow: 'Active · Arrears', icon: 'calendar-check', iconTone: 'cream',
    spark: [42,43,44,45,46,47,47], sparkColor: C.navy,
    rows: [
      { tone: 'ok',     text: '47 active tenancies' },
      { tone: 'action', text: '2 rent payments overdue' },
      { tone: 'watch',  text: '3 tenancies ending in 14d' },
    ],
  },
  {
    title: 'Supply', entry: 'landlords', eyebrow: 'Landlords · Leads', icon: 'building-2', iconTone: 'cream',
    spark: [3,4,5,6,7,8,8], sparkColor: C.navy,
    rows: [
      { tone: 'ok',     text: '8 landlord leads in pipeline' },
      { tone: 'action', text: '2 landlords pending verification' },
      { tone: 'watch',  text: '14 properties live · 3 draft' },
    ],
  },
  {
    title: 'Money', entry: 'payments', eyebrow: 'Payments · Payouts', icon: 'dollar-sign', iconTone: 'success',
    spark: [380,420,510,560,610,680,820], sparkColor: C.coral,
    rows: [
      { tone: 'ok',       text: '$4,820 collected past 7d' },
      { tone: 'critical', text: '1 Stripe payout failed' },
      { tone: 'ok',       text: '$720 service fee earned past 7d' },
    ],
  },
  {
    title: 'Trust & compliance', entry: 'trust-checklist', eyebrow: 'Trust · Docs', icon: 'shield-check', iconTone: 'navy',
    spark: [30,31,33,34,35,36,38], sparkColor: C.navy,
    rows: [
      { tone: 'watch',  text: '38% Trust checklist complete' },
      { tone: 'action', text: '2 condition reports pending review' },
      { tone: 'action', text: '1 SLA at risk' },
    ],
  },
  {
    title: 'Platform', entry: 'apps', eyebrow: 'Config · Integrations', icon: 'package', iconTone: 'cream',
    spark: [1,1,1,1,1,1,1], sparkColor: C.navy,
    rows: [
      { tone: 'ok', text: 'DocuSeal · Stripe · Resend · Sentry - all green' },
      { tone: 'ok', text: '0 domains expiring ≤ 30 days' },
      { tone: 'watch', text: 'Knowledge base last edited 3d ago' },
    ],
  },
];

function ZoneGrid({ onNavigate }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {ZONES.map((z, i) => <ZoneCard key={i} zone={z} onNavigate={onNavigate}/>)}
      </div>
    </section>
  );
}

function ZoneCard({ zone, onNavigate }) {
  const iconBg = {
    cream:   { bg: C.cream, fg: C.coralActive, border: C.creamBorder },
    navy:    { bg: C.navyTint, fg: C.navy, border: 'rgba(31,42,68,.15)' },
    success: { bg: C.successBg, fg: C.successFg, border: 'rgba(15,110,86,.2)' },
  }[zone.iconTone];
  const [hover, setHover] = useState(false);
  return (
    <Card padding={22}
      style={{
        transition: 'transform 200ms, box-shadow 200ms',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover
          ? '0 4px 12px rgba(8,6,13,.06), 0 2px 4px rgba(8,6,13,.04)'
          : '0 1px 2px rgba(8,6,13,.05), 0 1px 1px rgba(8,6,13,.03)',
        cursor: 'pointer',
      }}>
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onNavigate && onNavigate(zone.entry)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: iconBg.bg,
              border: `1px solid ${iconBg.border}`,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon name={zone.icon} size={16} color={iconBg.fg}/>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.2 }}>{zone.title}</h3>
              <Eyebrow>{zone.eyebrow}</Eyebrow>
            </div>
          </div>
          <Sparkline data={zone.spark} color={zone.sparkColor} width={84} height={26}/>
        </div>

        <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {zone.rows.map((r, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: C.ink2, lineHeight: 1.45 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, marginTop: 6, flexShrink: 0,
                background: { critical: C.danger, action: C.warning, watch: C.navy, ok: C.success }[r.tone] }}/>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600,
          color: hover ? C.coralActive : C.ink3, transition: 'color 200ms',
        }}>
          Open zone <Icon name="arrow-right" size={13}/>
        </span>
      </div>
    </Card>
  );
}

function MarketplacePulse() {
  const cells = [
    { label: 'MRR',              value: '$4,820',  unit: 'AUD',  delta: '↑ 6.2% vs prev 7d', tone: 'success',
      spark: [3800,4000,4150,4300,4400,4600,4820], sparkColor: C.coral, link: 'Revenue console →' },
    { label: 'Active tenancies', value: '47',      unit: null,   delta: '↑ 4 vs prev 7d',    tone: 'success',
      spark: [42,43,44,45,46,46,47], sparkColor: C.navy, link: 'Tenancies →' },
    { label: 'Conversion (enquiry → booking)', value: '18.4%', unit: null, delta: '↓ 1.2pp', tone: 'danger',
      spark: [22,21,20,19.5,19,18.6,18.4], sparkColor: C.navy, link: 'Funnel →' },
    { label: 'Avg weekly rent',  value: '$528',    unit: 'AUD',  delta: '↑ $12 vs prev 7d',  tone: 'success',
      spark: [515,518,520,522,524,526,528], sparkColor: C.coral, link: 'Properties →' },
  ];
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <Eyebrow color={C.ink4}>Marketplace pulse · past 7 days</Eyebrow>
        <a href="#" style={{ fontSize: 12, color: C.ink4, textDecoration: 'none' }}>Configure pulse</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
        {cells.map((c, i) => <PulseCell key={i} cell={c} isLast={i === cells.length - 1}/>)}
      </div>
    </section>
  );
}

function PulseCell({ cell, isLast }) {
  const deltaColor = { success: C.successFg, danger: C.dangerFg, neutral: C.ink4 }[cell.tone];
  return (
    <div style={{
      padding: '20px 22px',
      borderRight: isLast ? 'none' : `1px solid ${C.lineSoft}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <Eyebrow color={C.ink4}>{cell.label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tabnums" style={{ fontSize: 32, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>{cell.value}</span>
        {cell.unit && <span style={{ fontSize: 11, fontWeight: 600, color: C.ink5, letterSpacing: '0.06em' }}>{cell.unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999,
          fontSize: 11, fontWeight: 600, color: deltaColor,
          background: cell.tone === 'success' ? C.successBg : cell.tone === 'danger' ? C.dangerBg : C.s3,
        }}>{cell.delta}</span>
        <Sparkline data={cell.spark} color={cell.sparkColor} width={80} height={22} fill={false} dot={false}/>
      </div>
      <a href="#" style={{ fontSize: 12, fontWeight: 600, color: C.ink3, textDecoration: 'none', marginTop: 2 }}>{cell.link}</a>
    </div>
  );
}
