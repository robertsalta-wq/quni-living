// Shell: cream sidebar + persistent top bar + page padding.
const { useState, useEffect, useRef, useMemo } = React;

const C = {
  coral: '#FF6F61', coralHover: '#F2604F', coralActive: '#CC4A3C',
  coralTint: 'rgba(255,111,97,.08)', coralTint15: 'rgba(255,111,97,.15)',
  cream: '#FEF9E4', creamBorder: '#E8E0CC',
  navy: '#1F2A44', navyTint: 'rgba(31,42,68,.08)',
  ai: '#AA3BFF',
  ink: '#08060D', ink2: '#2A2433', ink3: '#4A4253', ink4: '#6B6375', ink5: '#908897',
  line: '#E5E4E7', lineSoft: '#EFEDE9',
  s1: '#FFFFFF', s2: '#F8F6F1', s3: '#F4F3EC',
  success: '#1D9E75', successFg: '#0F6E56', successBg: '#E6F4EE',
  warning: '#B7791F', warningFg: '#92400E', warningBg: '#FEF3C7',
  danger: '#DC2626', dangerFg: '#991B1B', dangerBg: '#FEF2F2',
  info: '#0369A1', infoFg: '#075985', infoBg: '#E0F2FE',
};
window.C = C;

const HOME_ITEM = { id: 'home', label: 'The Living Console', icon: 'layout-dashboard' };
window.HOME_ITEM = HOME_ITEM;

const NAV_SECTIONS = [
  { id: 'marketplace', label: 'Marketplace', icon: 'home', items: [
    { id: 'bookings',    label: 'Bookings',     icon: 'calendar-check' },
    { id: 'tier-events', label: 'Tier events',  icon: 'trending-up' },
    { id: 'enquiries',   label: 'Enquiries',    icon: 'message-square' },
    { id: 'properties',  label: 'Properties',   icon: 'home' },
  ]},
  { id: 'tenancies', label: 'Tenancies', icon: 'calendar-check', items: [
    { id: 'active-tenancies',  label: 'Active tenancies',  icon: 'calendar-check' },
    { id: 'condition-reports', label: 'Condition reports', icon: 'file-text' },
  ]},
  { id: 'supply', label: 'Supply', icon: 'building-2', items: [
    { id: 'landlords', label: 'Landlords',      icon: 'users' },
    { id: 'leads',     label: 'Landlord leads', icon: 'user-plus' },
  ]},
  { id: 'money', label: 'Money', icon: 'dollar-sign', items: [
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'pricing',  label: 'Pricing',  icon: 'tags' },
  ]},
  { id: 'trust', label: 'Trust & compliance', icon: 'shield-check', items: [
    { id: 'trust-checklist', label: 'Trust checklist', icon: 'shield-check' },
    { id: 'state-workflows', label: 'State workflows', icon: 'workflow' },
    { id: 'documents',       label: 'Documents',       icon: 'file-text' },
  ]},
  { id: 'platform', label: 'Platform', icon: 'package', items: [
    { id: 'apps',              label: 'Apps',              icon: 'app-window' },
    { id: 'domains',           label: 'Domains',           icon: 'globe' },
    { id: 'kb',                label: 'Knowledge base',    icon: 'book-open' },
    { id: 'qase',              label: 'Support (Qase)',    icon: 'life-buoy' },
    { id: 'business-settings', label: 'Business settings', icon: 'sliders' },
  ]},
];
window.NAV_SECTIONS = NAV_SECTIONS;

function zoneOf(id) {
  return NAV_SECTIONS.find(s => s.items.some(it => it.id === id));
}
window.zoneOf = zoneOf;

function navMeta(id) {
  if (id === 'home') return { section: 'Admin', item: HOME_ITEM.label };
  const z = zoneOf(id);
  if (z) {
    const it = z.items.find(i => i.id === id);
    return { section: z.label, item: it.label };
  }
  return { section: 'Admin', item: HOME_ITEM.label };
}
window.navMeta = navMeta;

function Sidebar({ active, onNavigate }) {
  // Only one zone open at a time. Auto-open the zone that owns `active`.
  const initial = (zoneOf(active) || {}).id || null;
  const [openZone, setOpenZone] = useState(initial);
  useEffect(() => {
    const z = zoneOf(active);
    if (z) setOpenZone(z.id);
  }, [active]);

  const onHeaderClick = (z) => {
    if (openZone === z.id) {
      // Already open — collapse it. Don't reroute.
      setOpenZone(null);
    } else {
      setOpenZone(z.id);
      onNavigate(z.items[0].id);
    }
  };

  return (
    <aside style={{
      width: 224, background: C.cream, borderRight: `1px solid ${C.creamBorder}`,
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'fixed', top: 0, left: 0, zIndex: 30,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* wordmark */}
      <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${C.creamBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 26, color: C.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>Quni</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.ink4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin</span>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px 6px' }}>
        {/* Home — The Living Console */}
        {(() => {
          const isActive = active === 'home';
          return (
            <button onClick={() => onNavigate('home')}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                padding: '8px 9px', borderRadius: 8, marginBottom: 10,
                background: isActive ? C.coralTint15 : 'transparent',
                color: isActive ? C.coralActive : C.ink2,
                fontSize: 13, fontWeight: isActive ? 600 : 600,
                border: 0, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.coralTint; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              <Icon name={HOME_ITEM.icon} size={15} color={isActive ? C.coralActive : C.ink3}/>
              <span>{HOME_ITEM.label}</span>
            </button>
          );
        })()}

        <div style={{ borderTop: `1px solid ${C.creamBorder}`, margin: '0 4px 8px' }}/>

        {NAV_SECTIONS.map((s) => {
          const open = openZone === s.id;
          const containsActive = s.items.some(it => it.id === active);
          return (
            <div key={s.id} style={{ marginBottom: 4 }}>
              <button onClick={() => onHeaderClick(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                  padding: '7px 9px', background: 'transparent', border: 0, cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: containsActive ? C.ink2 : C.ink5, fontFamily: 'inherit',
                  borderRadius: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.coralTint; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <Icon name="chevron-down" size={11} color={containsActive ? C.ink3 : C.ink5} style={{ transition: 'transform 150ms', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}/>
                <Icon name={s.icon} size={12} color={containsActive ? C.ink3 : C.ink5}/>
                <span>{s.label}</span>
              </button>
              {open && s.items.map(it => {
                const isActive = active === it.id;
                return (
                  <button key={it.id} onClick={() => onNavigate(it.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                      padding: '6px 9px 6px 26px', borderRadius: 8, marginBottom: 1,
                      background: isActive ? C.coralTint15 : 'transparent',
                      color: isActive ? C.coralActive : C.ink3,
                      fontSize: 13, fontWeight: isActive ? 600 : 500,
                      border: 0, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.coralTint; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                    <Icon name={it.icon} size={14} color={isActive ? C.coralActive : C.ink4}/>
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* user identity */}
      <div style={{ borderTop: `1px solid ${C.creamBorder}`, padding: 12, background: 'rgba(255,255,255,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: C.navy, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600 }}>SA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sam Admin</p>
            <p style={{ margin: 0, fontSize: 11, color: C.ink4 }}>sam@quni.au</p>
          </div>
          <button title="Sign out" style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: C.ink4, borderRadius: 6 }}>
            <Icon name="log-out" size={15}/>
          </button>
        </div>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;

function TopBar({ active }) {
  const meta = navMeta(active);
  const [env] = useState('live'); // 'live' | 'preview'
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${C.line}`, height: 56, display: 'flex', alignItems: 'center',
      padding: '0 40px 0 24px', gap: 16,
    }}>
      {/* breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink4, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{meta.section}</span>
        <Icon name="chevron-right" size={12} color={C.ink5}/>
        <span style={{ fontWeight: 600, color: C.ink }}>{meta.item}</span>
      </nav>

      {/* search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: 440, maxWidth: '100%', padding: '7px 10px', borderRadius: 10,
          background: C.s2, border: `1px solid ${C.line}`,
        }}>
          <Icon name="search" size={14} color={C.ink5}/>
          <input
            placeholder="Search bookings, students, properties…"
            style={{ flex: 1, border: 0, background: 'transparent', fontSize: 13, color: C.ink2, outline: 'none', fontFamily: 'inherit' }}/>
          <span className="kbd">⌘K</span>
        </div>
      </div>

      {/* right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <EnvBadge env={env}/>
        <button title="Notifications" style={{ position: 'relative', background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: C.ink3, borderRadius: 8 }}>
          <Icon name="bell" size={17}/>
          <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 999, background: C.coral, border: '1.5px solid #fff' }}/>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px', borderRadius: 999, border: `1px solid ${C.line}`, cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: C.navy, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>SA</div>
          <Icon name="chevron-down" size={12} color={C.ink4}/>
        </div>
      </div>
    </header>
  );
}
window.TopBar = TopBar;

function EnvBadge({ env }) {
  const live = env === 'live';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: live ? C.successBg : C.warningBg, color: live ? C.successFg : C.warningFg,
      border: `1px solid ${live ? 'rgba(15,110,86,.18)' : 'rgba(146,64,14,.18)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: live ? C.success : C.warning }}/>
      {live ? 'Live' : 'Preview'}
    </span>
  );
}

function House({ x, y, w, h, roof, pitch, pool, garden = true }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill={roof}/>
      {pitch && <polyline points={`0,${h*0.5} ${w*0.5},${h*0.5 - w*0.18} ${w},${h*0.5}`} fill="none" stroke="#08060D" strokeWidth="0.7" opacity="0.35"/>}
      {!pitch && <line x1="0" y1={h*0.5} x2={w} y2={h*0.5} stroke="#08060D" strokeWidth="0.7" opacity="0.3"/>}
      <line x1={w*0.5} y1="0" x2={w*0.5} y2={h} stroke="#08060D" strokeWidth="0.5" opacity="0.22"/>
      <rect x="0" y={h - 3} width={w} height="3" fill="#08060D" opacity="0.12"/>
      {garden && <rect x={w * 0.1} y={h + 4} width={w * 0.3} height="6" fill="#A4BE83" opacity="0.55"/>}
      {pool && <rect x={w * 0.55} y={h + 4} width={w * 0.35} height="11" fill="#7BB5D2" rx="2"/>}
    </g>
  );
}

function HomeBackdrop() {
  // Overhead aerial of a suburb — parkland, streets, rooftops, pools.
  // Painted as one SVG tile (560×460) repeated across the page so the texture
  // reads as a real neighbourhood from above. Muted earth + foliage palette
  // keyed to the cream/coral/navy system; sits behind cream and navy washes.
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Single full-canvas aerial of a suburb — not tiled. Rotated to mimic the off-axis aerial angle. */}
      <svg width="100%" height="100%" viewBox="0 0 1920 1200" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, opacity: 0.32 }}>
        <rect width="1920" height="1200" fill="#FDF7DF"/>
        <g transform="rotate(-7 960 600)">
          <rect x="-200" y="-200" width="2320" height="1600" fill="#FDF7DF"/>
          {/* Parkland blobs */}
          <path d="M-100 -100 C 240 -50, 420 -80, 540 80 C 580 220, 400 300, 240 260 C 80 240, -120 200, -100 -100 Z" fill="#DDE7C2"/>
          <ellipse cx="230" cy="120" rx="140" ry="66" fill="#B6CC92"/>
          <ellipse cx="230" cy="120" rx="96" ry="44" fill="none" stroke="#8FAA6E" strokeWidth="1.5" opacity="0.55"/>
          <path d="M820 700 C 940 680, 1050 720, 1090 820 C 1060 920, 940 940, 850 890 Z" fill="#DDE7C2"/>
          <path d="M1380 940 C 1620 900, 1900 980, 2120 1120 L 2120 1500 L 1300 1500 Z" fill="#DDE7C2"/>

          {/* Lake — soft kidney shape in the lower-right park, with shoreline highlight */}
          <path d="M1560 1020 C 1680 990, 1830 1010, 1900 1080 C 1940 1150, 1860 1210, 1740 1210 C 1620 1210, 1500 1170, 1500 1100 C 1500 1050, 1520 1030, 1560 1020 Z"
                fill="#7BB5D2"/>
          <path d="M1580 1030 C 1690 1010, 1820 1030, 1880 1090"
                fill="none" stroke="#9FCFE6" strokeWidth="2" opacity="0.7"/>
          <path d="M1600 1180 C 1700 1200, 1800 1190, 1860 1160"
                fill="none" stroke="#5A98B5" strokeWidth="1" opacity="0.5"/>
          {/* tiny boats / ripples */}
          <ellipse cx="1700" cy="1100" rx="6" ry="2" fill="#FDF7DF" opacity="0.7"/>
          <ellipse cx="1780" cy="1140" rx="5" ry="2" fill="#FDF7DF" opacity="0.6"/>
          <ellipse cx="1640" cy="1130" rx="4" ry="1.5" fill="#FDF7DF" opacity="0.55"/>

          {/* Smaller pond in the central green */}
          <ellipse cx="970" cy="820" rx="40" ry="22" fill="#7BB5D2"/>
          <ellipse cx="965" cy="815" rx="28" ry="12" fill="none" stroke="#9FCFE6" strokeWidth="1.5" opacity="0.7"/>

          {[ /* north-west park canopy */
             [60,40],[110,80],[160,40],[210,90],[260,50],[300,120],[160,160],[100,180],[60,140],[240,180],
             [340,80],[400,160],[440,220],[120,240],[200,250],[80,20],[180,20],[290,30],[380,50],[460,90],
             [500,160],[460,260],[380,260],[300,250],[140,290],[40,280],
             /* central green ring */
             [840,720],[890,760],[950,740],[1010,790],[890,820],[940,870],[820,790],[1040,760],[810,860],[1070,830],
             /* lake-side park canopy (denser, ringing the water) */
             [1410,990],[1470,1010],[1540,990],[1620,985],[1700,985],[1780,990],[1860,1000],[1940,1010],
             [1420,1080],[1410,1170],[1450,1240],[1920,1090],[1960,1170],[1900,1240],
             [1500,1240],[1580,1260],[1680,1250],[1780,1240],[1860,1240],
             [1340,1050],[1340,1130],[1340,1210],[1340,990],
             /* roadside copses (small clusters at street corners) */
             [550,300],[565,310],[1050,300],[1065,310],[1470,300],[1485,310],
             [550,640],[565,650],[1050,640],[1065,650],[1470,640],[1485,650],
             [550,960],[565,970],[1050,960],[1065,970]
          ].map(([x,y], i) => <circle key={'t'+i} cx={x} cy={y} r="9" fill="#8FAA6E" opacity="0.82"/>)}

          {/* Backyard tree dots scattered through residential blocks */}
          {[ [310,80],[480,90],[680,80],[860,90],[1040,80],[1240,90],[1440,80],[1640,90],[1840,80],
             [330,210],[510,220],[710,210],[890,220],[1070,210],[1270,220],[1470,210],[1670,220],[1870,210],
             [60,410],[260,400],[420,410],[660,400],[860,410],[1040,400],[1330,400],[1530,410],[1760,400],
             [80,540],[280,550],[440,540],[680,550],[880,540],[1070,550],[1340,540],[1540,550],[1770,540],
             [60,740],[260,750],[440,740],[1140,740],[1340,740],
             [80,880],[280,890],[440,880],[1140,880],[1340,880],
             [60,1080],[260,1090],[440,1080],[660,1080],[860,1090],[1040,1080]
          ].map(([x,y], i) => <circle key={'bt'+i} cx={x} cy={y} r="5" fill="#7E9B62" opacity="0.7"/>)}

          {/* Streets */}
          <rect x="-200" y="290" width="2320" height="32" fill="#EDE4CD"/>
          <rect x="-200" y="630" width="2320" height="28" fill="#EDE4CD"/>
          <rect x="-200" y="950" width="2320" height="28" fill="#EDE4CD"/>
          <rect x="540" y="-200" width="26" height="1600" fill="#EDE4CD"/>
          <rect x="1040" y="-200" width="24" height="1600" fill="#EDE4CD"/>
          <rect x="1460" y="-200" width="26" height="1600" fill="#EDE4CD"/>
          <line x1="-200" y1="306" x2="2120" y2="306" stroke="#C9BEA1" strokeWidth="1.2" strokeDasharray="14 10" opacity="0.7"/>
          <line x1="-200" y1="644" x2="2120" y2="644" stroke="#C9BEA1" strokeWidth="1.2" strokeDasharray="14 10" opacity="0.7"/>
          <line x1="-200" y1="964" x2="2120" y2="964" stroke="#C9BEA1" strokeWidth="1.2" strokeDasharray="14 10" opacity="0.7"/>
          <line x1="553" y1="-200" x2="553" y2="1400" stroke="#C9BEA1" strokeWidth="1" strokeDasharray="10 10" opacity="0.7"/>
          <line x1="1052" y1="-200" x2="1052" y2="1400" stroke="#C9BEA1" strokeWidth="1" strokeDasharray="10 10" opacity="0.7"/>
          <line x1="1473" y1="-200" x2="1473" y2="1400" stroke="#C9BEA1" strokeWidth="1" strokeDasharray="10 10" opacity="0.7"/>

          {/* Houses — each placed by hand, varied size + roof colour */}
          <House x={600}  y={20}  w={70} h={100} roof="#D08469" pitch/>
          <House x={690}  y={14}  w={80} h={110} roof="#B26553"/>
          <House x={790}  y={20}  w={74} h={100} roof="#DD9376" pitch pool/>
          <House x={884}  y={18}  w={80} h={106} roof="#9A7B62"/>
          <House x={980}  y={22}  w={56} h={96}  roof="#C77762" pitch/>
          <House x={610}  y={148} w={86} h={100} roof="#8B98A4"/>
          <House x={710}  y={146} w={74} h={106} roof="#D08469" pitch pool/>
          <House x={800}  y={150} w={86} h={98}  roof="#E0A581"/>
          <House x={900}  y={146} w={76} h={106} roof="#B45F4B" pitch/>
          <House x={990}  y={150} w={56} h={100} roof="#9A7B62"/>

          <House x={1090} y={20}  w={80} h={106} roof="#DD9376" pitch/>
          <House x={1190} y={14}  w={74} h={110} roof="#8B98A4"/>
          <House x={1280} y={20}  w={80} h={104} roof="#D08469" pitch pool/>
          <House x={1380} y={22}  w={68} h={100} roof="#B26553"/>
          <House x={1090} y={148} w={86} h={104} roof="#C77762" pitch/>
          <House x={1190} y={150} w={74} h={100} roof="#E0A581"/>
          <House x={1284} y={146} w={78} h={106} roof="#9A7B62" pitch/>
          <House x={1380} y={150} w={68} h={104} roof="#8B98A4"/>

          <House x={1510} y={20}  w={74} h={100} roof="#E0A581" pitch/>
          <House x={1600} y={14}  w={80} h={110} roof="#B26553"/>
          <House x={1696} y={22}  w={76} h={104} roof="#D08469" pitch pool/>
          <House x={1790} y={20}  w={70} h={100} roof="#9A7B62"/>
          <House x={1510} y={148} w={80} h={100} roof="#8B98A4"/>
          <House x={1610} y={146} w={74} h={106} roof="#DD9376" pitch/>
          <House x={1704} y={150} w={78} h={100} roof="#C77762" pool/>
          <House x={1798} y={148} w={68} h={106} roof="#B45F4B" pitch/>

          <House x={20}   y={340} w={80} h={110} roof="#D08469" pitch/>
          <House x={120}  y={346} w={74} h={100} roof="#B26553"/>
          <House x={214}  y={340} w={86} h={106} roof="#DD9376" pitch pool/>
          <House x={320}  y={348} w={74} h={100} roof="#8B98A4"/>
          <House x={414}  y={342} w={76} h={106} roof="#9A7B62" pitch/>
          <House x={20}   y={476} w={86} h={110} roof="#B45F4B" pitch/>
          <House x={126}  y={478} w={74} h={100} roof="#E0A581"/>
          <House x={220}  y={472} w={80} h={106} roof="#D08469" pitch pool/>
          <House x={320}  y={478} w={76} h={100} roof="#C77762"/>
          <House x={416}  y={476} w={80} h={106} roof="#9A7B62" pitch/>

          <House x={600}  y={340} w={80} h={106} roof="#DD9376" pitch/>
          <House x={700}  y={344} w={80} h={100} roof="#8B98A4" pool/>
          <House x={800}  y={340} w={76} h={106} roof="#D08469" pitch/>
          <House x={894}  y={346} w={74} h={100} roof="#B26553"/>
          <House x={988}  y={342} w={56} h={106} roof="#E0A581" pitch/>
          <House x={600}  y={476} w={86} h={110} roof="#9A7B62" pitch/>
          <House x={706}  y={478} w={74} h={100} roof="#C77762"/>
          <House x={800}  y={472} w={86} h={106} roof="#8B98A4" pool/>
          <House x={906}  y={478} w={68} h={100} roof="#DD9376" pitch/>
          <House x={996}  y={476} w={56} h={106} roof="#B45F4B"/>

          <House x={1090} y={340} w={124} h={120} roof="#9A7B62" pitch/>
          <House x={1230} y={344} w={104} h={116} roof="#D08469" pool/>
          <House x={1346} y={340} w={104} h={120} roof="#8B98A4" pitch/>
          <House x={1090} y={490} w={104} h={120} roof="#DD9376"/>
          <House x={1210} y={486} w={124} h={124} roof="#B26553" pitch pool/>
          <House x={1346} y={490} w={104} h={120} roof="#C77762"/>

          <House x={1510} y={346} w={80} h={100} roof="#D08469" pitch/>
          <House x={1606} y={340} w={74} h={106} roof="#8B98A4" pool/>
          <House x={1700} y={348} w={80} h={100} roof="#E0A581"/>
          <House x={1794} y={346} w={74} h={106} roof="#9A7B62" pitch/>
          <House x={1510} y={478} w={86} h={106} roof="#B26553" pitch/>
          <House x={1610} y={480} w={74} h={100} roof="#DD9376" pool/>
          <House x={1704} y={476} w={80} h={106} roof="#C77762" pitch/>
          <House x={1800} y={480} w={68} h={100} roof="#8B98A4"/>

          <House x={20}   y={680} w={80} h={106} roof="#E0A581" pitch/>
          <House x={120}  y={676} w={74} h={110} roof="#B45F4B"/>
          <House x={214}  y={680} w={86} h={106} roof="#DD9376" pitch pool/>
          <House x={320}  y={686} w={74} h={100} roof="#D08469"/>
          <House x={414}  y={680} w={76} h={106} roof="#8B98A4" pitch/>
          <House x={20}   y={816} w={86} h={110} roof="#9A7B62" pitch/>
          <House x={126}  y={820} w={74} h={100} roof="#C77762"/>
          <House x={220}  y={814} w={80} h={106} roof="#B26553" pitch pool/>
          <House x={320}  y={820} w={76} h={100} roof="#DD9376"/>
          <House x={416}  y={816} w={80} h={106} roof="#8B98A4" pitch/>

          <House x={1110} y={680} w={80} h={106} roof="#D08469" pitch/>
          <House x={1210} y={676} w={74} h={110} roof="#E0A581"/>
          <House x={1304} y={680} w={86} h={106} roof="#B26553" pitch pool/>
          <House x={1410} y={686} w={56} h={100} roof="#8B98A4"/>
          <House x={1110} y={816} w={86} h={110} roof="#DD9376" pitch/>
          <House x={1216} y={820} w={74} h={100} roof="#9A7B62"/>
          <House x={1310} y={814} w={80} h={106} roof="#C77762" pitch pool/>
          <House x={1410} y={820} w={56} h={100} roof="#B45F4B"/>

          <House x={20}   y={1010} w={80} h={106} roof="#E0A581" pitch/>
          <House x={120}  y={1006} w={74} h={110} roof="#B26553" pool/>
          <House x={214}  y={1010} w={86} h={106} roof="#D08469" pitch/>
          <House x={320}  y={1016} w={74} h={100} roof="#9A7B62"/>
          <House x={414}  y={1010} w={76} h={106} roof="#8B98A4" pitch/>
          <House x={600}  y={1010} w={80} h={106} roof="#C77762" pitch/>
          <House x={700}  y={1006} w={74} h={110} roof="#DD9376" pool/>
          <House x={794}  y={1010} w={86} h={106} roof="#B45F4B" pitch/>
          <House x={900}  y={1016} w={74} h={100} roof="#8B98A4"/>
          <House x={994}  y={1010} w={56} h={106} roof="#E0A581" pitch/>

          {/* Street trees — along both arterials and side streets */}
          {[
            [560,330],[560,395],[560,460],[560,525],[560,590],
            [560,670],[560,735],[560,800],[560,865],[560,925],
            [560,1015],[560,1080],[560,1140],
            [1058,30],[1058,95],[1058,160],[1058,225],
            [1058,330],[1058,395],[1058,460],[1058,525],[1058,590],
            [1058,670],[1058,735],[1058,800],[1058,865],[1058,925],
            [1058,1015],[1058,1080],[1058,1140],
            [1480,30],[1480,95],[1480,160],[1480,225],
            [1480,330],[1480,395],[1480,460],[1480,525],[1480,590],
            [1480,670],[1480,735],[1480,800],[1480,865],[1480,925],
            [30,275],[110,275],[190,275],[270,275],[350,275],[430,275],[510,275],
            [600,275],[680,275],[760,275],[840,275],[920,275],[1000,275],
            [1090,275],[1170,275],[1250,275],[1330,275],[1410,275],
            [1510,275],[1600,275],[1690,275],[1780,275],[1860,275],
            [30,615],[110,615],[190,615],[270,615],[350,615],[430,615],[510,615],
            [600,615],[680,615],[760,615],[840,615],[920,615],[1000,615],
            [1090,615],[1170,615],[1250,615],[1330,615],[1410,615],
            [1510,615],[1600,615],[1690,615],[1780,615],[1860,615],
            [30,940],[110,940],[190,940],[270,940],[350,940],[430,940],[510,940],
            [600,940],[680,940],[760,940],[840,940],[920,940],[1000,940]
          ].map(([x,y], i) => <circle key={'st'+i} cx={x} cy={y} r="7" fill="#7E9B62" opacity="0.8"/>)}
        </g>
      </svg>

      {/* Cream wash, top-left — keeps copy area legible */}
      <div style={{
        position: 'absolute', inset: '-20% -10% 40% -10%',
        background: 'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(254,249,228,.55), rgba(254,249,228,0) 70%)',
      }}/>
      {/* Warm coral wash, far right */}
      <div style={{
        position: 'absolute', top: '-12%', right: '-8%', width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,111,97,.06), rgba(255,111,97,0) 65%)',
      }}/>
      {/* Navy ink wash, lower left */}
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-6%', width: 640, height: 640, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31,42,68,.04), rgba(31,42,68,0) 65%)',
      }}/>
    </div>
  );
}

function Shell({ active, onNavigate, children }) {
  const isHome = active === 'home';
  if (isHome) {
    return (
      <div style={{ minHeight: '100vh', background: C.s1, fontFamily: 'Inter, sans-serif', color: C.ink2, position: 'relative', overflow: 'hidden' }}>
        <HomeBackdrop/>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '40px 40px 56px' }}>
          {children}
        </main>
      </div>
    );
  }
  return (
    <div style={{ minHeight: '100vh', background: C.s2, fontFamily: 'Inter, sans-serif', color: C.ink2 }}>
      <Sidebar active={active} onNavigate={onNavigate}/>
      <div style={{ paddingLeft: 224 }}>
        <TopBar active={active}/>
        <main style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 40px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function HomeChrome({ onNavigate }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      maxWidth: 1280, margin: '0 auto', padding: '22px 40px 6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 28, color: C.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>Quni</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.ink4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
    </header>
  );
}
window.Shell = Shell;

// ============================ Shared primitives =============================

function Card({ children, padding = 24, style }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16,
      boxShadow: '0 1px 2px rgba(8,6,13,.05), 0 1px 1px rgba(8,6,13,.03)',
      padding, ...style,
    }}>{children}</div>
  );
}
window.Card = Card;

function Button({ kind = 'primary', size = 'md', icon, iconRight, children, onClick, style }) {
  const sizes = {
    sm: { padding: '5px 10px', fontSize: 12, gap: 6, radius: 8 },
    md: { padding: '8px 14px', fontSize: 13, gap: 7, radius: 10 },
    lg: { padding: '10px 18px', fontSize: 14, gap: 8, radius: 10 },
  }[size];
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: sizes.gap, padding: sizes.padding,
    borderRadius: sizes.radius, fontSize: sizes.fontSize, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 150ms, border-color 150ms, color 150ms',
  };
  const kinds = {
    primary: { background: C.coral, color: '#fff', border: '1px solid ' + C.coral },
    secondary: { background: C.navy, color: '#fff', border: '1px solid ' + C.navy },
    ghost: { background: '#fff', color: C.ink2, border: '1px solid ' + C.line },
    ghostDark: { background: '#fff', color: C.ink2, border: '1px solid ' + C.line },
    link: { background: 'transparent', color: C.coralActive, border: 0, padding: 0 },
  }[kind];
  const onEnter = e => {
    if (kind === 'primary') e.currentTarget.style.background = C.coralHover;
    if (kind === 'secondary') e.currentTarget.style.background = C.navy + 'ee';
    if (kind === 'ghost') e.currentTarget.style.background = C.s2;
  };
  const onLeave = e => {
    if (kind === 'primary') e.currentTarget.style.background = C.coral;
    if (kind === 'secondary') e.currentTarget.style.background = C.navy;
    if (kind === 'ghost') e.currentTarget.style.background = '#fff';
  };
  return (
    <button onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ ...base, ...kinds, ...style }}>
      {icon && <Icon name={icon} size={sizes.fontSize + 2}/>}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.fontSize + 2}/>}
    </button>
  );
}
window.Button = Button;

function Eyebrow({ children, color }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: color || C.ink5, margin: 0 }}>{children}</p>;
}
window.Eyebrow = Eyebrow;

function Pill({ tone = 'neutral', dot, icon, children, style }) {
  const tones = {
    neutral: { bg: C.s3, fg: C.ink3 },
    coral:   { bg: C.coralTint15, fg: C.coralActive },
    navy:    { bg: C.navyTint, fg: C.navy },
    success: { bg: C.successBg, fg: C.successFg },
    warning: { bg: C.warningBg, fg: C.warningFg },
    danger:  { bg: C.dangerBg, fg: C.dangerFg },
    info:    { bg: C.infoBg, fg: C.infoFg },
    ink:     { bg: 'rgba(8,6,13,.06)', fg: C.ink },
  }[tone];
  const dotColor = { critical: C.danger, action: C.warning, watch: C.navy, ok: C.success }[dot] || tones.fg;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: tones.bg, color: tones.fg, whiteSpace: 'nowrap', ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor }}/>}
      {icon && <Icon name={icon} size={11}/>}
      {children}
    </span>
  );
}
window.Pill = Pill;

function VerifiedBadge({ role }) {
  const map = {
    landlord: { bg: C.coralTint15, fg: C.coralActive, label: 'Landlord' },
    student:  { bg: C.navyTint, fg: C.navy, label: 'Student' },
    identity: { bg: 'rgba(8,6,13,.06)', fg: C.ink, label: 'Identity' },
  }[role];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px 2px 5px', borderRadius: 999, fontSize: 10, fontWeight: 600,
      background: map.bg, color: map.fg,
    }}>
      <Icon name="check" size={10}/> {map.label}
    </span>
  );
}
window.VerifiedBadge = VerifiedBadge;

// Tiny sparkline.
function Sparkline({ data, color = C.navy, width = 96, height = 28, fill = true, dot = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: 'block' }} viewBox={`0 0 ${width} ${height}`}>
      {fill && <path d={area} fill={color} opacity="0.08"/>}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {dot && <circle cx={last[0]} cy={last[1]} r="2.2" fill={color}/>}
    </svg>
  );
}
window.Sparkline = Sparkline;
