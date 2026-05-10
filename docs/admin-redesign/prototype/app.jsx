// App — routes between Overview, Bookings, Pricing, and state stubs.

function App() {
  const [active, setActive] = useState('home');
  let page;
  if (active === 'home')          page = <OverviewPage onNavigate={setActive}/>;
  else if (active === 'bookings') page = <BookingsPage/>;
  else if (active === 'pricing')  page = <PricingPage/>;
  else                            page = <StatesPage active={active}/>;
  return <Shell active={active} onNavigate={setActive}>{page}</Shell>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
