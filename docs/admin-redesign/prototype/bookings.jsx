// Bookings — dense table with toolbar, sticky header, detail drawer.

const STUDENTS = [
  { name: 'Aisha Chen',      uni: 'USYD',       initials: 'AC', verified: true,  tier: 'T1' },
  { name: 'Liam O\u2019Brien', uni: 'UNSW',     initials: 'LO', verified: true,  tier: 'T2' },
  { name: 'Priya Raman',     uni: 'UTS',        initials: 'PR', verified: false, tier: 'T2' },
  { name: 'Noah Williams',   uni: 'Macquarie',  initials: 'NW', verified: true,  tier: 'T1' },
  { name: 'Mei Tanaka',      uni: 'USYD',       initials: 'MT', verified: true,  tier: 'T3' },
  { name: 'Daniel Park',     uni: 'UNSW',       initials: 'DP', verified: true,  tier: 'T2' },
  { name: 'Sophie Nguyen',   uni: 'UTS',        initials: 'SN', verified: false, tier: 'T1' },
  { name: 'Ethan Singh',     uni: 'Macquarie',  initials: 'ES', verified: true,  tier: 'T1' },
  { name: 'Olivia Hart',     uni: 'USYD',       initials: 'OH', verified: true,  tier: 'T2' },
  { name: 'Hiro Sato',       uni: 'UNSW',       initials: 'HS', verified: true,  tier: 'T3' },
  { name: 'Zara Khan',       uni: 'UTS',        initials: 'ZK', verified: false, tier: 'T2' },
  { name: 'Jack Murray',     uni: 'Macquarie',  initials: 'JM', verified: true,  tier: 'T1' },
];
const PROPERTIES = [
  { addr: '12 Bedford St',     suburb: 'Newtown',       rent: 540, color: '#C4A574' },
  { addr: '4 Glebe Point Rd',  suburb: 'Glebe',         rent: 585, color: '#8FAEC4' },
  { addr: '78 Mallett St',     suburb: 'Camperdown',    rent: 520, color: '#A6907A' },
  { addr: '23 Anzac Pde',      suburb: 'Kensington',    rent: 610, color: '#7BA09A' },
  { addr: '9 Belmore Rd',      suburb: 'Randwick',      rent: 645, color: '#9B7FB0' },
  { addr: '15 Talavera Rd',    suburb: 'Macquarie Park',rent: 480, color: '#B5856B' },
  { addr: '88 King St',        suburb: 'Newtown',       rent: 495, color: '#79938C' },
  { addr: '6 Cowper St',       suburb: 'Glebe',         rent: 535, color: '#A89178' },
  { addr: '42 Salisbury Rd',   suburb: 'Camperdown',    rent: 560, color: '#8DA5C0' },
  { addr: '17 Doncaster Ave',  suburb: 'Kensington',    rent: 595, color: '#C49E80' },
  { addr: '34 Avoca St',       suburb: 'Randwick',      rent: 625, color: '#92A88E' },
  { addr: '52 Herring Rd',     suburb: 'Macquarie Park',rent: 510, color: '#A38FAE' },
];
const STATUSES = ['confirmed','pending','awaiting','confirmed','pending','confirmed','awaiting','confirmed','declined','pending','confirmed','completed'];
const MOVEIN = ['27 Feb 2026','3 Mar 2026','27 Feb 2026','15 Mar 2026','27 Feb 2026','3 Mar 2026','10 Mar 2026','27 Feb 2026','27 Feb 2026','3 Mar 2026','15 Mar 2026','27 Feb 2026'];

const BOOKINGS = STUDENTS.map((s, i) => ({
  id: 'BK-' + (2841 + i),
  student: s,
  property: PROPERTIES[i],
  status: STATUSES[i],
  movein: MOVEIN[i],
  rent: PROPERTIES[i].rent,
  enquired: `${15 + (i % 8)} Jan 2026`,
  agreement: i % 3 === 0 ? 'Signed' : i % 3 === 1 ? 'Sent' : 'Draft',
  bond: i % 4 === 0 ? 'Lodged' : 'Pending',
}));

function StatusPill({ status }) {
  const m = {
    confirmed: { tone: 'success', label: 'Confirmed' },
    pending:   { tone: 'warning', label: 'Pending payment' },
    awaiting:  { tone: 'info',    label: 'Awaiting info' },
    completed: { tone: 'navy',    label: 'Completed' },
    declined:  { tone: 'danger',  label: 'Declined' },
    cancelled: { tone: 'neutral', label: 'Cancelled' },
  }[status];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

function TierBadge({ tier }) {
  const m = {
    T1: { bg: C.coralTint15, fg: C.coralActive, label: 'T1' },
    T2: { bg: C.navyTint,    fg: C.navy,        label: 'T2' },
    T3: { bg: C.s3,          fg: C.ink3,        label: 'T3' },
  }[tier];
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 6,
      background: m.bg, color: m.fg, fontSize: 11, fontWeight: 700,
    }}>{m.label}</span>
  );
}

function ChipFilter({ label, value, options = ['All'], active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px 5px 12px', borderRadius: 999,
      background: active ? C.coralTint15 : '#fff',
      border: `1px solid ${active ? C.coralBorder : C.line}`,
      fontSize: 12, fontWeight: 500, color: active ? C.coralActive : C.ink3,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span style={{ color: C.ink5, fontWeight: 500 }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <Icon name="chevron-down" size={11} color={C.ink5}/>
    </button>
  );
}

function PropertyThumb({ p }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: p.color, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background:
          `linear-gradient(135deg, rgba(255,255,255,.18), rgba(0,0,0,.12))` }}/>
        <Icon name="home" size={14} color="rgba(255,255,255,.85)" style={{ position: 'absolute', top: 11, left: 11 }}/>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.addr}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.ink4 }}>{p.suburb}</p>
      </div>
    </div>
  );
}

function StudentCell({ s }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <div style={{ width: 30, height: 30, borderRadius: 999, background: C.s3, color: C.ink2, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{s.initials}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap' }}>{s.name}</p>
        {s.verified && <div style={{ marginTop: 2 }}><VerifiedBadge role="student"/></div>}
        {!s.verified && <span style={{ fontSize: 11, color: C.ink5 }}>Unverified</span>}
      </div>
    </div>
  );
}

function BookingsPage() {
  const [selected, setSelected] = useState(BOOKINGS[2]); // drawer open on row 3 (Priya)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.015em' }}>Bookings</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.ink4 }}>All booking requests and their status.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button kind="ghost" size="md" icon="filter">Export</Button>
            <Button kind="primary" size="md" icon="plus">New booking</Button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12,
          padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: C.s2, border: `1px solid ${C.line}`, flex: 1, minWidth: 240, maxWidth: 320 }}>
            <Icon name="search" size={13} color={C.ink5}/>
            <input placeholder="Search by name, property, ID" style={{ border: 0, background: 'transparent', fontSize: 13, color: C.ink2, outline: 'none', fontFamily: 'inherit', flex: 1 }}/>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ChipFilter label="Status" value="All"/>
            <ChipFilter label="Tier" value="All"/>
            <ChipFilter label="University" value="All"/>
            <ChipFilter label="Move-in" value="This semester" active/>
          </div>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: C.ink4 }}>
            <strong style={{ color: C.ink2 }}>12</strong> of 47 · sorted by <strong style={{ color: C.ink2 }}>Move-in ↑</strong>
          </span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(8,6,13,.05)' }}>
          <div style={{ overflowX: 'auto', maxHeight: 720, overflowY: 'auto' }}>
            <table style={{ width: '100%', minWidth: 940, borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'Inter, sans-serif' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: C.s2 }}>
                  {['Student','Property','University','Tier','Move-in','Status','Weekly rent',''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 6 ? 'right' : 'left', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: C.ink5,
                      padding: '10px 14px', borderBottom: `1px solid ${C.line}`,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BOOKINGS.map((b, i) => (
                  <tr key={b.id} data-row
                    onClick={() => setSelected(b)}
                    style={{
                      background: selected.id === b.id ? C.cream : (i % 2 === 1 ? C.s2 : '#fff'),
                      cursor: 'pointer',
                      borderLeft: selected.id === b.id ? `2px solid ${C.coral}` : '2px solid transparent',
                    }}>
                    <td style={cellStyle(i, BOOKINGS.length)}><StudentCell s={b.student}/></td>
                    <td style={cellStyle(i, BOOKINGS.length)}><PropertyThumb p={b.property}/></td>
                    <td style={cellStyle(i, BOOKINGS.length)}><span style={{ fontSize: 13, color: C.ink2 }}>{b.student.uni}</span></td>
                    <td style={cellStyle(i, BOOKINGS.length)}><TierBadge tier={b.student.tier}/></td>
                    <td style={cellStyle(i, BOOKINGS.length)}><span className="tabnums" style={{ fontSize: 13, color: C.ink2 }}>{b.movein}</span></td>
                    <td style={cellStyle(i, BOOKINGS.length)}><StatusPill status={b.status}/></td>
                    <td style={{ ...cellStyle(i, BOOKINGS.length), textAlign: 'right' }}>
                      <span className="tabnums" style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>${b.rent}</span>
                      <span style={{ fontSize: 11, color: C.ink5 }}> /wk</span>
                    </td>
                    <td style={{ ...cellStyle(i, BOOKINGS.length), textAlign: 'right', width: 40 }}>
                      <button style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: C.ink4, borderRadius: 6 }}>
                        <Icon name="more-horizontal" size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.line}`, background: '#fff' }}>
            <span style={{ fontSize: 12, color: C.ink4 }}>Showing <strong style={{ color: C.ink2 }}>1–12</strong> of <strong style={{ color: C.ink2 }}>47</strong></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.ink4 }}>
                Rows: <select style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: '3px 6px', fontSize: 12, fontFamily: 'inherit', background: '#fff', color: C.ink2 }}>
                  <option>12</option><option>25</option><option>50</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={pageBtn(false)}><Icon name="chevron-left" size={13}/></button>
                <button style={pageBtn(true)}>1</button>
                <button style={pageBtn(false)}>2</button>
                <button style={pageBtn(false)}>3</button>
                <button style={pageBtn(false)}>4</button>
                <button style={pageBtn(false)}><Icon name="chevron-right" size={13}/></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingDrawer booking={selected} onClose={() => setSelected(BOOKINGS[2])}/>
    </div>
  );
}
window.BookingsPage = BookingsPage;

function cellStyle(i, total) {
  return { padding: '14px 14px', borderBottom: i === total - 1 ? '0' : `1px solid ${C.lineSoft}`, fontSize: 13, color: C.ink2, verticalAlign: 'middle', whiteSpace: 'nowrap' };
}
function pageBtn(active) {
  return {
    minWidth: 28, height: 28, padding: '0 8px', borderRadius: 6,
    border: `1px solid ${active ? 'transparent' : C.line}`,
    background: active ? C.ink : '#fff',
    color: active ? '#fff' : C.ink3,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-grid', placeItems: 'center',
  };
}

function BookingDrawer({ booking, onClose }) {
  const b = booking;
  return (
    <aside style={{
      width: 380, flexShrink: 0, background: '#fff',
      border: `1px solid ${C.line}`, borderRadius: 16,
      boxShadow: '0 4px 12px rgba(8,6,13,.06), 0 2px 4px rgba(8,6,13,.04)',
      position: 'sticky', top: 84,
      maxHeight: 'calc(100vh - 110px)', overflowY: 'auto',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Booking · {b.id}</Eyebrow>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: '4px 0 6px' }}>{b.student.name} → {b.property.suburb}</h3>
          <StatusPill status={b.status}/>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: C.ink4, borderRadius: 6 }}>
          <Icon name="x" size={16}/>
        </button>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KV rows={[
          ['Student',       <span>{b.student.name} · <span style={{ color: C.ink4 }}>{b.student.uni}</span></span>],
          ['Property',      `${b.property.addr}, ${b.property.suburb}`],
          ['Tier',          <TierBadge tier={b.student.tier}/>],
          ['Move-in date',  b.movein],
          ['Weekly rent',   `$${b.rent} AUD`],
          ['Enquired',      b.enquired],
        ]}/>

        <div>
          <Eyebrow>Trust checklist</Eyebrow>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CheckRow done label="Identity verified"/>
            <CheckRow done label="Student enrolment confirmed (UTS)"/>
            <CheckRow label="Tenancy agreement signed"/>
            <CheckRow label="Bond lodged with RBO"/>
          </ul>
        </div>

        <div>
          <Eyebrow>Activity</Eyebrow>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, fontSize: 12, color: C.ink3, lineHeight: 1.5 }}>
            <li style={{ paddingLeft: 14, borderLeft: `1px solid ${C.line}`, paddingBottom: 10, position: 'relative' }}>
              <span style={{ position: 'absolute', left: -4, top: 5, width: 7, height: 7, borderRadius: 999, background: C.coral }}/>
              <strong style={{ color: C.ink2 }}>Awaiting info</strong> — verification documents requested · <span className="tabnums">22 Jan, 14:02</span>
            </li>
            <li style={{ paddingLeft: 14, borderLeft: `1px solid ${C.line}`, paddingBottom: 10, position: 'relative' }}>
              <span style={{ position: 'absolute', left: -4, top: 5, width: 7, height: 7, borderRadius: 999, background: C.ink5 }}/>
              Booking created by Priya Raman · <span className="tabnums">19 Jan, 09:18</span>
            </li>
            <li style={{ paddingLeft: 14, paddingBottom: 0, position: 'relative' }}>
              <span style={{ position: 'absolute', left: -4, top: 5, width: 7, height: 7, borderRadius: 999, background: C.ink5 }}/>
              Enquiry received · <span className="tabnums">17 Jan, 19:44</span>
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="primary" size="md" style={{ flex: 1, justifyContent: 'center' }}>Approve booking</Button>
          <Button kind="ghost" size="md">Message</Button>
        </div>
      </div>
    </aside>
  );
}

function KV({ rows }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 9, columnGap: 12 }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt style={{ fontSize: 12, color: C.ink5, fontWeight: 500 }}>{k}</dt>
          <dd style={{ margin: 0, fontSize: 13, color: C.ink2 }}>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function CheckRow({ done, label }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: done ? C.ink2 : C.ink4 }}>
      <span style={{
        width: 16, height: 16, borderRadius: 999, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: done ? C.successBg : '#fff', border: `1px solid ${done ? 'rgba(15,110,86,.3)' : C.line}`,
      }}>
        {done && <Icon name="check" size={10} color={C.successFg}/>}
      </span>
      <span style={{ textDecoration: done ? 'none' : 'none' }}>{label}</span>
    </li>
  );
}
