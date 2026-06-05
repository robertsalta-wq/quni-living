// Pricing - heavy form with tabs, live preview, change log.

function PricingPage() {
  const [tab, setTab] = useState('listing');
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8, gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Pill tone="success" dot="ok">LIVE · PHASE 1</Pill>
            <span style={{ fontSize: 12, color: C.ink5 }}>Effective from <span className="tabnums">1 Feb 2026</span></span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.015em' }}>Pricing</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.ink4 }}>
            Service tier configuration · all changes are date / time stamped.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button kind="ghost" size="md">Discard</Button>
          <Button kind="primary" size="md" icon="check">Save changes</Button>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ borderBottom: `1px solid ${C.line}`, display: 'flex', gap: 0, marginTop: 18, marginBottom: 24 }}>
        {[
          { id: 'listing', label: 'Listing', sub: '$99 flat' },
          { id: 'managed', label: 'Managed', sub: '7%' },
          { id: 'history', label: 'History' },
          { id: 'changelog', label: 'Change log' },
        ].map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              padding: '10px 14px', background: 'transparent', border: 0, cursor: 'pointer',
              borderBottom: `2px solid ${active ? C.coral : 'transparent'}`,
              color: active ? C.ink : C.ink4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              marginBottom: -1,
            }}>
              {t.label}
              {t.sub && <span style={{ fontSize: 12, fontWeight: 500, color: active ? C.ink4 : C.ink5 }}>· {t.sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Body: two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'flex-start' }}>
        <PricingForm/>
        <LivePreview/>
      </div>

      {/* Change log */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Recent changes</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.ink4 }}>Last 5 amendments - all changes are immutable and date / time stamped.</p>
          </div>
          <a href="#" style={{ fontSize: 13, fontWeight: 600, color: C.coralActive, textDecoration: 'none' }}>View full history →</a>
        </div>
        <ChangeLog/>
      </div>
    </div>
  );
}
window.PricingPage = PricingPage;

function PricingForm() {
  return (
    <Card padding={0}>
      <FormSection title="Tier identity" subtitle="Surfaced to landlords when they choose a tier.">
        <FormRow label="Tier name">
          <Input value="Listing"/>
        </FormRow>
        <FormRow label="Public description" hint="Shown on the public pricing page (Lora, italic).">
          <Textarea value="Self-service listing tier. You manage enquiries, bookings and the tenancy agreement; we handle marketplace exposure and verification."/>
        </FormRow>
      </FormSection>

      <FormSection title="Fees" subtitle="Flat fees apply per booking. Percentage tiers compute on weekly rent.">
        <FormRow label="Fee model">
          <Segmented options={[['flat','Flat fee'],['pct','Percentage']]} value="flat"/>
        </FormRow>
        <FormRow label="Fee amount">
          <div style={{ display: 'flex', gap: 8 }}>
            <Currency value="99"/>
            <Select value="AUD"/>
          </div>
        </FormRow>
        <FormRow label="Fee floor" hint="Minimum fee charged regardless of computed value.">
          <Currency value="49"/>
        </FormRow>
      </FormSection>

      <FormSection title="Weekly rent caps" subtitle="Rent range a landlord may set within this tier.">
        <FormRow label="Minimum weekly rent">
          <Currency value="220"/>
        </FormRow>
        <FormRow label="Maximum weekly rent">
          <Currency value="950"/>
        </FormRow>
      </FormSection>

      <FormSection title="Effective dates" subtitle="When this configuration goes live. Past dates are immutable.">
        <FormRow label="Effective from">
          <DateField value="01/02/2026"/>
        </FormRow>
        <FormRow label="Effective to" hint="Leave empty for open-ended.">
          <DateField value="" placeholder="dd/mm/yyyy"/>
        </FormRow>
      </FormSection>

      <FormSection title="Availability" subtitle="Where this tier may be offered." last>
        <FormRow label="States">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['NSW',true],['VIC',true],['QLD',true],['WA',false],['SA',false],['TAS',false],['ACT',true],['NT',false]].map(([st,on]) => (
              <StateChip key={st} label={st} on={on}/>
            ))}
          </div>
        </FormRow>
        <FormRow label="Visible to">
          <Segmented options={[['all','All landlords'],['verified','Verified only']]} value="verified"/>
        </FormRow>
      </FormSection>
    </Card>
  );
}

function FormSection({ title, subtitle, children, last }) {
  return (
    <div style={{ padding: 24, borderBottom: last ? 'none' : `1px solid ${C.lineSoft}` }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.ink4 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}
function FormRow({ label, hint, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ paddingTop: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: C.ink2, margin: 0 }}>{label}</p>
        {hint && <p style={{ margin: '3px 0 0', fontSize: 11, color: C.ink5, lineHeight: 1.4 }}>{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Input({ value, placeholder }) {
  return (
    <input defaultValue={value} placeholder={placeholder} style={{
      width: '100%', padding: '8px 12px', borderRadius: 10,
      border: `1px solid ${C.line}`, background: '#fff', fontSize: 13,
      color: C.ink, fontFamily: 'inherit', outline: 'none',
    }}/>
  );
}
function Textarea({ value }) {
  return (
    <textarea defaultValue={value} rows={3} style={{
      width: '100%', padding: '10px 12px', borderRadius: 10,
      border: `1px solid ${C.line}`, background: '#fff', fontSize: 13,
      color: C.ink2, fontFamily: 'inherit', lineHeight: 1.55, outline: 'none', resize: 'vertical',
    }}/>
  );
}
function Currency({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', flex: 1, gap: 6 }}>
      <span style={{ fontSize: 13, color: C.ink5 }}>$</span>
      <input defaultValue={value} className="tabnums" style={{ border: 0, background: 'transparent', fontSize: 13, color: C.ink, fontFamily: 'inherit', outline: 'none', width: '100%' }}/>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.ink5, letterSpacing: '0.06em' }}>AUD</span>
    </div>
  );
}
function Select({ value }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.line}`,
      background: '#fff', fontSize: 13, color: C.ink, fontFamily: 'inherit', cursor: 'pointer',
    }}>{value} <Icon name="chevron-down" size={12} color={C.ink5}/></button>
  );
}
function Segmented({ options, value }) {
  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: C.s2, border: `1px solid ${C.line}` }}>
      {options.map(([k, label]) => (
        <button key={k} style={{
          padding: '5px 14px', borderRadius: 7, border: 0,
          background: value === k ? '#fff' : 'transparent',
          color: value === k ? C.ink : C.ink4,
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          boxShadow: value === k ? '0 1px 2px rgba(8,6,13,.06)' : 'none',
        }}>{label}</button>
      ))}
    </div>
  );
}
function DateField({ value, placeholder = 'dd/mm/yyyy' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.line}`, background: '#fff', gap: 8, maxWidth: 200 }}>
      <input defaultValue={value} placeholder={placeholder} className="tabnums" style={{ border: 0, background: 'transparent', fontSize: 13, color: C.ink, fontFamily: 'inherit', outline: 'none', flex: 1 }}/>
      <Icon name="calendar-check" size={14} color={C.ink5}/>
    </div>
  );
}
function StateChip({ label, on }) {
  return (
    <button style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
      background: on ? C.coralTint15 : '#fff',
      border: `1px solid ${on ? 'rgba(255,111,97,.3)' : C.line}`,
      color: on ? C.coralActive : C.ink4,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {on && <Icon name="check" size={10}/>} {label}
    </button>
  );
}

function LivePreview() {
  return (
    <div style={{ position: 'sticky', top: 84 }}>
      <Card padding={0}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Eyebrow color={C.ink4}>Live preview</Eyebrow>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.ink3 }}>What a landlord sees today</p>
          </div>
          <Pill tone="navy" dot="ok">Synced</Pill>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.coralActive }}>Listing tier</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 26, color: C.ink, margin: '6px 0 4px', letterSpacing: '-0.02em' }}>List it yourself.</h3>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: C.ink3, lineHeight: 1.55 }}>
            Self-service listing tier. You manage enquiries, bookings and the tenancy agreement; we handle marketplace exposure and verification.
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingBottom: 16, borderBottom: `1px solid ${C.lineSoft}`, marginBottom: 16 }}>
            <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 42, color: C.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>$99</span>
            <span style={{ fontSize: 13, color: C.ink4 }}>flat per booking · AUD</span>
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              'Rent range $220–$950 / week',
              'Available in NSW · VIC · QLD · ACT',
              'Visible to verified landlords',
              'Effective from 1 Feb 2026',
            ].map((t, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: C.ink2 }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: C.successBg, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon name="check" size={10} color={C.successFg}/>
                </span>
                {t}
              </li>
            ))}
          </ul>

          <button style={{
            marginTop: 20, width: '100%', padding: '11px 14px',
            background: C.coral, color: '#fff', border: 0, borderRadius: 10,
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}>Choose Listing tier</button>
        </div>
      </Card>

      <p style={{ margin: '12px 4px 0', fontSize: 11, color: C.ink5, lineHeight: 1.45 }}>
        Preview reflects unsaved changes. Public surfaces update only after <strong style={{ color: C.ink3 }}>Save changes</strong>.
      </p>
    </div>
  );
}

function ChangeLog() {
  const changes = [
    { when: '02 Feb 2026, 14:22', who: 'Sam Admin',   field: 'Fee amount',         old: '$89', neu: '$99' },
    { when: '02 Feb 2026, 14:21', who: 'Sam Admin',   field: 'Fee floor',          old: '$39', neu: '$49' },
    { when: '28 Jan 2026, 09:05', who: 'Mira Patel',  field: 'Effective from',     old: '15 Jan 2026', neu: '01 Feb 2026' },
    { when: '14 Jan 2026, 16:48', who: 'Sam Admin',   field: 'Maximum weekly rent',old: '$880',neu: '$950' },
    { when: '11 Jan 2026, 11:14', who: 'Mira Patel',  field: 'States - ACT',       old: 'Off',neu: 'On' },
  ];
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif' }}>
        <thead>
          <tr style={{ background: C.s2 }}>
            {['Date','Field','Old value','New value','Author'].map((h, i) => (
              <th key={i} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.ink5, padding: '10px 14px', borderBottom: `1px solid ${C.line}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => (
            <tr key={i}>
              <td className="tabnums" style={logCell(i, changes.length)}>{c.when}</td>
              <td style={logCell(i, changes.length)}>{c.field}</td>
              <td style={logCell(i, changes.length)}>
                <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 6, background: C.dangerBg, color: C.dangerFg, fontSize: 12, fontWeight: 500, fontFamily: 'ui-monospace, SF Mono, monospace', textDecoration: 'line-through' }}>{c.old}</span>
              </td>
              <td style={logCell(i, changes.length)}>
                <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 6, background: C.successBg, color: C.successFg, fontSize: 12, fontWeight: 500, fontFamily: 'ui-monospace, SF Mono, monospace' }}>{c.neu}</span>
              </td>
              <td style={logCell(i, changes.length)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: C.s3, color: C.ink2, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600 }}>{c.who.split(' ').map(w=>w[0]).join('')}</span>
                  {c.who}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function logCell(i, total) {
  return { padding: '11px 14px', borderBottom: i === total - 1 ? '0' : `1px solid ${C.lineSoft}`, fontSize: 13, color: C.ink2, verticalAlign: 'middle' };
}
