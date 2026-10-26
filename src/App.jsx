import { useEffect, useMemo, useState, useCallback } from 'react'

const GAMMA = 'https://gamma-api.polymarket.com'
const CLOB = 'https://clob.polymarket.com'
const CG = 'https://api.coingecko.com/api/v3'

const nf = (o) => new Intl.NumberFormat('ar-SA-u-nu-latn', o)
const usd = (v, d) => (v < 0 ? '-$' : '$') + nf({ minimumFractionDigits: d ?? 0, maximumFractionDigits: d ?? (Math.abs(v) < 1 ? 4 : Math.abs(v) < 100 ? 2 : 0) }).format(Math.abs(v))
const compact = (v) => '$' + nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v)
const pct = (v) => (v > 0 ? '+' : '') + nf({ maximumFractionDigits: 2 }).format(v) + '%'
const cents = (p) => nf({ maximumFractionDigits: 1 }).format(p * 100) + '¢'
const parse = (s) => { try { return JSON.parse(s) } catch { return [] } }

function useFetch(url, deps = []) {
  const [s, set] = useState({ data: null, error: null, loading: true })
  const load = useCallback(() => {
    if (!url) return
    set((p) => ({ ...p, loading: true, error: null }))
    fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then((data) => set({ data, error: null, loading: false }))
      .catch((e) => set({ data: null, error: e, loading: false }))
  }, [url])
  useEffect(load, [load, ...deps])
  return { ...s, reload: load }
}

/* ---------- icons ---------- */
const I = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  poly: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h9" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8h4a2 2 0 0 1 0 4h-4m0 0h4.5a2 2 0 0 1 0 4H9.5V8m2-2v2m0 8v2" /></>,
  trades: <path d="M4 7h13l-3-3M20 17H7l3 3" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  back: <path d="m9 6 6 6-6 6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
}
const Icon = ({ n, s = 24, w = 1.8 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{I[n]}</svg>

/* ---------- charts (time flows left→right, as in all financial charts) ---------- */
function Spark({ pts, w = 72, h = 28 }) {
  if (!pts || pts.length < 2) return <svg width={w} height={h} />
  const mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - 2 - ((p - mn) / r) * (h - 4)}`).join(' ')
  const up = pts[pts.length - 1] >= pts[0]
  return <svg width={w} height={h} style={{ direction: 'ltr' }}><polyline points={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="1.6" strokeLinejoin="round" /></svg>
}
function Chart({ pts, h = 200, fmt }) {
  const [hover, setHover] = useState(null)
  if (!pts || pts.length < 2) return <div className="state">لا توجد بيانات كافية للرسم</div>
  const W = 360, ys = pts.map((p) => p[1]), mn = Math.min(...ys), mx = Math.max(...ys), r = mx - mn || 1
  const X = (i) => (i / (pts.length - 1)) * W, Y = (v) => h - 8 - ((v - mn) / r) * (h - 24)
  const line = pts.map((p, i) => `${X(i)},${Y(p[1])}`).join(' ')
  const up = ys[ys.length - 1] >= ys[0], c = up ? 'var(--up)' : 'var(--down)'
  const hi = hover ?? pts.length - 1
  const onMove = (e) => {
    const b = e.currentTarget.getBoundingClientRect()
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - b.left) / b.width
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round(x * (pts.length - 1)))))
  }
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ height: 22, fontSize: 13, color: 'var(--label-2)' }}>
        <span className="num">{fmt(pts[hi][1])}</span> · {new Date(pts[hi][0]).toLocaleString('ar-SA-u-nu-latn', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
      <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} style={{ direction: 'ltr', touchAction: 'pan-y', display: 'block' }}
        onMouseMove={onMove} onTouchMove={onMove} onTouchStart={onMove} onMouseLeave={() => setHover(null)} onTouchEnd={() => setHover(null)}>
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={up ? '#30D158' : '#FF5A5F'} stopOpacity=".28" /><stop offset="1" stopColor={up ? '#30D158' : '#FF5A5F'} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,${h} ${line} ${W},${h}`} fill="url(#g)" />
        <polyline points={line} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
        {hover != null && <line x1={X(hi)} x2={X(hi)} y1="0" y2={h} stroke="var(--label-3)" strokeDasharray="3 3" />}
        <circle cx={X(hi)} cy={Y(pts[hi][1])} r="4.5" fill={c} stroke="var(--bg)" strokeWidth="2" />
      </svg>
    </div>
  )
}

/* ---------- shared ---------- */
const Skel = ({ n = 6, h = 64 }) => <div className="section">{Array.from({ length: n }).map((_, i) => <div key={i} className="skel" style={{ height: h, marginBottom: 10 }} />)}</div>
const ErrorState = ({ onRetry, what }) => <div className="state">تعذّر تحميل {what}.<br /><button className="btn ghost" style={{ width: 160, marginTop: 12 }} onClick={onRetry}>إعادة المحاولة</button></div>
const Change = ({ v }) => <span className={'pill num ' + (v >= 0 ? 'up' : 'down')}>{pct(v)}</span>
const Nav = ({ title, sub, children }) => <div className="navbar"><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}{children}</div>
const PushNav = ({ title, onBack }) => <div className="navbar" style={{ paddingBottom: 4 }}><div className="navrow"><button className="iconbtn" aria-label="رجوع" onClick={onBack}><Icon n="back" /></button><div className="t">{title}</div><div style={{ width: 44 }} /></div></div>

/* ---------- data hooks ---------- */
const useMarkets = () => useFetch(`${GAMMA}/markets?active=true&closed=false&limit=60&order=volume24hr&ascending=false`)
const useCoins = () => useFetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=true&price_change_percentage=24h`)
const normMarket = (m) => { const o = parse(m.outcomes), p = parse(m.outcomePrices).map(Number); return { ...m, o, p, yes: p[0] ?? 0, tokens: parse(m.clobTokenIds) } }

/* ---------- demo trades ---------- */
const DEMO = [
  { id: 1, kind: 'crypto', sym: 'BTC', name: 'بيتكوين', side: 'شراء', qty: 0.05, entry: 92000, cur: 98500 },
  { id: 2, kind: 'crypto', sym: 'ETH', name: 'إيثريوم', side: 'شراء', qty: 1.2, entry: 3600, cur: 3420 },
  { id: 3, kind: 'poly', sym: 'نعم', name: 'سوق تجريبي: هل يتجاوز المؤشر X مستوى Y؟', side: 'نعم', qty: 200, entry: 0.42, cur: 0.55 },
  { id: 4, kind: 'crypto', sym: 'SOL', name: 'سولانا', side: 'شراء', qty: 10, entry: 180, cur: 195 },
]
function useTrades() {
  const [t, setT] = useState(() => { try { return JSON.parse(localStorage.getItem('demo-trades')) || DEMO } catch { return DEMO } })
  useEffect(() => localStorage.setItem('demo-trades', JSON.stringify(t)), [t])
  return [t, setT]
}
const pnl = (x) => (x.cur - x.entry) * x.qty

/* ---------- screens ---------- */
function Home({ go, trades }) {
  const coins = useCoins(), mk = useMarkets()
  const total = trades.reduce((a, x) => a + x.cur * x.qty, 0), p = trades.reduce((a, x) => a + pnl(x), 0)
  const movers = coins.data ? [...coins.data].filter(c => c.price_change_percentage_24h != null).sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h)).slice(0, 4) : null
  return <div className="scroll fade">
    <Nav title="الرئيسية" sub={new Date().toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })} />
    <div className="section"><div className="hero">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="lbl">قيمة المحفظة</span><span className="badge">بيانات تجريبية</span></div>
      <div className="big num">{usd(total, 2)}</div>
      <div style={{ whiteSpace: 'nowrap' }}><span className={'num ' + (p >= 0 ? 'up' : 'down')} style={{ fontSize: 15, fontWeight: 600 }}>{(p >= 0 ? '+' : '') + usd(p, 2)}</span> <span style={{ color: 'var(--label-2)', fontSize: 13 }}>إجمالي الربح/الخسارة</span></div>
    </div></div>
    <div className="sh"><h2>الأكثر حركة · ٢٤ ساعة</h2><button onClick={() => go('crypto')}>الكل</button></div>
    {coins.loading ? <Skel n={4} /> : coins.error ? <ErrorState what="أسعار الكربتو" onRetry={coins.reload} /> :
      <div className="section"><div className="card">{movers.map(c => <CoinRow key={c.id} c={c} onClick={() => go('crypto', { coin: c })} />)}</div></div>}
    <div className="sh"><h2>الأسواق الأكثر تداولاً</h2><button onClick={() => go('poly')}>الكل</button></div>
    {mk.loading ? <Skel n={3} h={110} /> : mk.error ? <ErrorState what="أسواق بولي ماركت" onRetry={mk.reload} /> :
      <div className="section">{mk.data.slice(0, 3).map(normMarket).map(m => <MarketCard key={m.id} m={m} onClick={() => go('poly', { market: m })} />)}</div>}
    <div className="note">مصادر البيانات الحية: CoinGecko و Polymarket. الأسعار للمتابعة فقط وليست نصيحة استثمارية.</div>
  </div>
}

function CoinRow({ c, onClick }) {
  return <button className="row" onClick={onClick}>
    <img className="avatar" src={c.image} alt="" loading="lazy" style={{ borderRadius: 20 }} />
    <div className="main"><div className="title">{c.name}</div><div className="meta">{c.symbol.toUpperCase()} · <span className="num">{compact(c.market_cap)}</span></div></div>
    <Spark pts={c.sparkline_in_7d?.price?.filter((_, i) => i % 4 === 0)} />
    <div className="end" style={{ minWidth: 86 }}><div className="num" style={{ fontWeight: 600, fontSize: 15 }}>{usd(c.current_price)}</div><div><Change v={c.price_change_percentage_24h ?? 0} /></div></div>
  </button>
}

function MarketCard({ m, onClick }) {
  const binary = m.o.length === 2
  return <button className="mcard" onClick={onClick}>
    <div className="q">{m.image && <img src={m.image} alt="" loading="lazy" />}<span style={{ flex: 1 }} dir="auto">{m.question}</span>
      {binary && <span className="num" style={{ fontSize: 20, fontWeight: 700, color: m.yes >= .5 ? 'var(--up)' : 'var(--down)' }}>{Math.round(m.yes * 100)}%</span>}</div>
    {binary && <div className="bar" style={{ direction: 'ltr' }}><i style={{ width: `${m.yes * 100}%` }} /></div>}
    <div className="mfoot"><span>{binary ? <>نعم <span className="num">{cents(m.p[0])}</span> · لا <span className="num">{cents(m.p[1])}</span></> : m.o.join(' / ')}</span><span>حجم ٢٤س <span className="num">{compact(m.volume24hr || 0)}</span></span></div>
  </button>
}

const CATS = [
  ['all', 'الكل', null],
  ['politics', 'سياسة', /elect|trump|president|senate|congress|minister|party|vote|biden|democrat|republican|governor|putin|zelensky|nato/i],
  ['sports', 'رياضة', /win|vs\.?|nba|nfl|fc|league|cup|champions|game|match|ufc|f1|grand prix|open|series|mlb|nhl/i],
  ['crypto', 'كربتو', /bitcoin|btc|eth|ethereum|solana|sol|crypto|xrp|doge|token|coin|\$/i],
  ['econ', 'اقتصاد', /fed|rate|inflation|cpi|gdp|recession|stock|s&p|nasdaq|tariff|oil|gold/i],
]
function Poly({ open }) {
  const mk = useMarkets(), [q, setQ] = useState(''), [cat, setCat] = useState('all')
  const list = useMemo(() => {
    if (!mk.data) return []
    const re = CATS.find(c => c[0] === cat)[2]
    return mk.data.map(normMarket).filter(m => (!re || re.test(m.question)) && (!q || m.question.toLowerCase().includes(q.toLowerCase())))
  }, [mk.data, q, cat])
  return <div className="scroll fade">
    <Nav title="بولي ماركت" sub="أسواق التوقعات · مرتبة حسب حجم التداول ٢٤ ساعة" />
    <div className="search"><span style={{ color: 'var(--label-3)' }}><Icon n="search" s={18} /></span><input placeholder="ابحث في الأسواق (بالإنجليزية)" value={q} onChange={e => setQ(e.target.value)} enterKeyHint="search" /></div>
    <div className="chips">{CATS.map(c => <button key={c[0]} className={'chip' + (cat === c[0] ? ' on' : '')} onClick={() => setCat(c[0])}>{c[1]}</button>)}</div>
    {mk.loading ? <Skel n={5} h={110} /> : mk.error ? <ErrorState what="الأسواق" onRetry={mk.reload} /> :
      list.length === 0 ? <div className="state">لا توجد أسواق مطابقة</div> :
        <div className="section">{list.map(m => <MarketCard key={m.id} m={m} onClick={() => open(m)} />)}</div>}
  </div>
}

function MarketDetail({ m, onBack, addTrade }) {
  const [iv, setIv] = useState('1w'), [sheet, setSheet] = useState(null)
  const token = m.tokens[0]
  const h = useFetch(token ? `${CLOB}/prices-history?market=${token}&interval=${iv}&fidelity=${iv === '1d' ? 10 : 60}` : null)
  const pts = h.data?.history?.map(x => [x.t * 1000, x.p])
  return <div className="screen push">
    <PushNav title="تفاصيل السوق" onBack={onBack} />
    <div className="scroll">
      <div className="section"><div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.5 }} dir="auto">{m.question}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 8 }}><span className="num" style={{ fontSize: 34, fontWeight: 700 }}>{Math.round(m.yes * 100)}%</span><span style={{ color: 'var(--label-2)' }}>احتمال «{m.o[0] === 'Yes' ? 'نعم' : m.o[0]}»</span>
          {m.oneDayPriceChange != null && <Change v={m.oneDayPriceChange * 100} />}</div></div>
      <div className="seg">{[['1d', 'يوم'], ['1w', 'أسبوع'], ['1m', 'شهر'], ['max', 'الكل']].map(([k, l]) => <button key={k} className={iv === k ? 'on' : ''} onClick={() => setIv(k)}>{l}</button>)}</div>
      {h.loading ? <div className="section"><div className="skel" style={{ height: 222 }} /></div> : h.error ? <ErrorState what="الرسم البياني" onRetry={h.reload} /> : <Chart pts={pts} fmt={cents} />}
      <div className="kv">
        <div><span>حجم ٢٤ ساعة</span><b className="num">{compact(m.volume24hr || 0)}</b></div>
        <div><span>الحجم الكلي</span><b className="num">{compact(m.volumeNum || 0)}</b></div>
        <div><span>السيولة</span><b className="num">{compact(Number(m.liquidity) || 0)}</b></div>
        <div><span>ينتهي</span><b>{m.endDate ? new Date(m.endDate).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</b></div>
      </div>
      {m.o.length === 2 && <div style={{ display: 'flex', gap: 10, padding: '12px 16px' }}>
        <button className="btn yes" onClick={() => setSheet(0)}>{m.o[0] === 'Yes' ? 'نعم' : m.o[0]} <span className="num">{cents(m.p[0])}</span></button>
        <button className="btn no" onClick={() => setSheet(1)}>{m.o[1] === 'No' ? 'لا' : m.o[1]} <span className="num">{cents(m.p[1])}</span></button></div>}
      {m.description && <div className="note" dir="auto" style={{ whiteSpace: 'pre-line' }}>{m.description.slice(0, 600)}{m.description.length > 600 ? '…' : ''}</div>}
    </div>
    {sheet != null && <TradeSheet m={m} side={sheet} onClose={() => setSheet(null)} addTrade={addTrade} />}
  </div>
}

function TradeSheet({ m, side: s0, onClose, addTrade }) {
  const [side, setSide] = useState(s0), [amt, setAmt] = useState('50'), [done, setDone] = useState(false)
  const price = m.p[side], shares = price > 0 ? (Number(amt) || 0) / price : 0
  const label = (i) => (m.o[i] === 'Yes' ? 'نعم' : m.o[i] === 'No' ? 'لا' : m.o[i])
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  return <>
    <div className="backdrop" onClick={onClose} />
    <div className="sheet" role="dialog" aria-label="محاكاة صفقة">
      <div className="grab" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 17 }}>محاكاة صفقة</b><span className="badge">تجريبي · بدون تنفيذ حقيقي</span></div>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 4px' }}>
        <button className={'btn yes' + (side === 0 ? ' on' : '')} style={{ height: 44 }} onClick={() => setSide(0)}>{label(0)}</button>
        <button className={'btn no' + (side === 1 ? ' on' : '')} style={{ height: 44 }} onClick={() => setSide(1)}>{label(1)}</button></div>
      <label className="field"><span>المبلغ (دولار)</span><input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></label>
      <div className="field"><span>السعر الحالي</span><span className="num">{cents(price)}</span></div>
      <div className="field"><span>عدد الأسهم المتوقع</span><span className="num">{nf({ maximumFractionDigits: 2 }).format(shares)}</span></div>
      <div className="field"><span>العائد إذا تحقق</span><span className="num up">{usd(shares, 2)}</span></div>
      <button className="btn primary" style={{ marginTop: 10 }} disabled={done || !shares} onClick={() => {
        addTrade({ id: Date.now(), kind: 'poly', sym: label(side), name: m.question, side: label(side), qty: +shares.toFixed(2), entry: price, cur: price }); setDone(true); setTimeout(onClose, 700)
      }}>{done ? 'أُضيفت إلى الصفقات التجريبية ✓' : 'أضف كصفقة تجريبية'}</button>
    </div>
  </>
}

function Crypto({ open }) {
  const coins = useCoins(), [q, setQ] = useState('')
  const list = coins.data?.filter(c => !q || (c.name + c.symbol).toLowerCase().includes(q.toLowerCase()))
  return <div className="scroll fade">
    <Nav title="الكربتو" sub="أعلى العملات حسب القيمة السوقية" />
    <div className="search"><span style={{ color: 'var(--label-3)' }}><Icon n="search" s={18} /></span><input placeholder="ابحث عن عملة" value={q} onChange={e => setQ(e.target.value)} /></div>
    {coins.loading ? <Skel n={8} /> : coins.error ? <ErrorState what="أسعار الكربتو (قد يكون حد الطلبات من CoinGecko، أعد المحاولة بعد دقيقة)" onRetry={coins.reload} /> :
      !list.length ? <div className="state">لا توجد نتائج</div> :
        <div className="section"><div className="card">{list.map(c => <CoinRow key={c.id} c={c} onClick={() => open(c)} />)}</div></div>}
  </div>
}

function CoinDetail({ c, onBack }) {
  const [d, setD] = useState('7')
  const h = useFetch(`${CG}/coins/${c.id}/market_chart?vs_currency=usd&days=${d}`)
  return <div className="screen push">
    <PushNav title={c.name} onBack={onBack} />
    <div className="scroll">
      <div className="section" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={c.image} alt="" width="48" height="48" style={{ borderRadius: 24 }} />
        <div><div className="num" style={{ fontSize: 32, fontWeight: 700 }}>{usd(c.current_price)}</div><Change v={c.price_change_percentage_24h ?? 0} /> <span style={{ color: 'var(--label-2)', fontSize: 13 }}>٢٤ ساعة</span></div>
      </div>
      <div className="seg">{[['1', 'يوم'], ['7', 'أسبوع'], ['30', 'شهر'], ['365', 'سنة']].map(([k, l]) => <button key={k} className={d === k ? 'on' : ''} onClick={() => setD(k)}>{l}</button>)}</div>
      {h.loading ? <div className="section"><div className="skel" style={{ height: 222 }} /></div> : h.error ? <ErrorState what="الرسم البياني" onRetry={h.reload} /> : <Chart pts={h.data.prices} fmt={(v) => usd(v)} />}
      <div className="kv">
        <div><span>القيمة السوقية</span><b className="num">{compact(c.market_cap)}</b></div>
        <div><span>حجم ٢٤ ساعة</span><b className="num">{compact(c.total_volume)}</b></div>
        <div><span>أعلى ٢٤س</span><b className="num">{usd(c.high_24h)}</b></div>
        <div><span>أدنى ٢٤س</span><b className="num">{usd(c.low_24h)}</b></div>
        <div><span>أعلى سعر تاريخي</span><b className="num">{usd(c.ath)}</b></div>
        <div><span>الترتيب</span><b className="num">#{c.market_cap_rank}</b></div>
      </div>
      <div className="note">المصدر: CoinGecko. آخر تحديث: {new Date(c.last_updated).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>
}

function Trades({ trades, setTrades }) {
  const [add, setAdd] = useState(false)
  const p = trades.reduce((a, x) => a + pnl(x), 0), cost = trades.reduce((a, x) => a + x.entry * x.qty, 0)
  return <div className="scroll fade">
    <Nav title="الصفقات" sub="مراكزي المفتوحة"><div style={{ marginTop: 8 }}><span className="badge">بيانات تجريبية · غير مرتبطة بأي حساب</span></div></Nav>
    <div className="kv">
      <div><span>إجمالي الربح/الخسارة</span><b className={'num ' + (p >= 0 ? 'up' : 'down')}>{(p >= 0 ? '+' : '') + usd(p, 2)}</b></div>
      <div><span>العائد</span><b className={'num ' + (p >= 0 ? 'up' : 'down')}>{cost ? pct((p / cost) * 100) : '—'}</b></div>
    </div>
    <div className="sh"><h2>المراكز</h2><button onClick={() => setAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="plus" s={18} /> صفقة تجريبية</button></div>
    {trades.length === 0 ? <div className="state">لا توجد صفقات بعد.<br />أضف صفقة تجريبية لتجربة التطبيق.</div> :
      <div className="section"><div className="card">{trades.map(x => {
        const v = pnl(x), r = ((x.cur - x.entry) / x.entry) * 100
        return <div className="row" key={x.id}>
          <div className="avatar" style={{ fontSize: x.sym.length > 3 ? 11 : 13 }}>{x.sym}</div>
          <div className="main"><div className="title" dir="auto">{x.name}</div><div className="meta" style={{whiteSpace:'nowrap'}}>{x.side} · <span className="num">{nf({ maximumFractionDigits: 4 }).format(x.qty)}</span> @ <span className="num">{x.kind === 'poly' ? cents(x.entry) : usd(x.entry)}</span></div></div>
          <div className="end"><div className={'num ' + (v >= 0 ? 'up' : 'down')} style={{ fontWeight: 600, display: 'block' }}>{(v >= 0 ? '+' : '') + usd(v, 2)}</div><div className="meta"><span className="num">{pct(r)}</span></div></div>
          <button className="iconbtn" aria-label="حذف" style={{ color: 'var(--label-3)', marginInlineEnd: -12 }} onClick={() => setTrades(t => t.filter(y => y.id !== x.id))}><Icon n="trash" s={18} /></button>
        </div>
      })}</div></div>}
    <div className="note">هذه البيانات أمثلة توضيحية محفوظة في متصفحك فقط. لا يوجد تداول حقيقي أو ربط محفظة.</div>
    {add && <AddTrade onClose={() => setAdd(false)} onAdd={(t) => { setTrades(x => [t, ...x]); setAdd(false) }} />}
  </div>
}

function AddTrade({ onClose, onAdd }) {
  const [f, setF] = useState({ sym: 'BTC', qty: '0.01', entry: '', cur: '' })
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok = f.sym && +f.qty > 0 && +f.entry > 0 && +f.cur > 0
  return <>
    <div className="backdrop" onClick={onClose} />
    <div className="sheet"><div className="grab" />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 17 }}>صفقة تجريبية جديدة</b><span className="badge">تجريبي</span></div>
      <label className="field"><span>الرمز</span><input value={f.sym} onChange={s('sym')} dir="ltr" /></label>
      <label className="field"><span>الكمية</span><input inputMode="decimal" value={f.qty} onChange={s('qty')} dir="ltr" /></label>
      <label className="field"><span>سعر الدخول ($)</span><input inputMode="decimal" value={f.entry} onChange={s('entry')} dir="ltr" placeholder="0" /></label>
      <label className="field"><span>السعر الحالي ($)</span><input inputMode="decimal" value={f.cur} onChange={s('cur')} dir="ltr" placeholder="0" /></label>
      <button className="btn primary" style={{ marginTop: 10, opacity: ok ? 1 : .4 }} disabled={!ok} onClick={() => onAdd({ id: Date.now(), kind: 'crypto', sym: f.sym.toUpperCase().slice(0, 5), name: f.sym.toUpperCase(), side: 'شراء', qty: +f.qty, entry: +f.entry, cur: +f.cur })}>إضافة</button>
    </div>
  </>
}

function Settings({ setTrades }) {
  const [rm, setRm] = useState(false)
  return <div className="scroll fade">
    <Nav title="الإعدادات" />
    <div className="sh"><h2 style={{ fontSize: 13, color: 'var(--label-2)', fontWeight: 500 }}>العرض</h2></div>
    <div className="section"><div className="card">
      <div className="row"><div className="main"><div className="title">الوضع الداكن</div><div className="meta">مفعّل افتراضياً</div></div><div className="toggle on" /></div>
      <div className="row"><div className="main"><div className="title">العملة</div></div><span style={{ color: 'var(--label-2)' }}>دولار أمريكي</span></div>
    </div></div>
    <div className="sh"><h2 style={{ fontSize: 13, color: 'var(--label-2)', fontWeight: 500 }}>البيانات</h2></div>
    <div className="section"><div className="card">
      <button className="row" onClick={() => { setTrades(DEMO); setRm(true) }}><div className="main"><div className="title">إعادة تعيين الصفقات التجريبية</div><div className="meta">{rm ? 'تمت إعادة التعيين ✓' : 'استرجاع الأمثلة الافتراضية'}</div></div></button>
      <button className="row" onClick={() => setTrades([])}><div className="main"><div className="title down">مسح كل الصفقات</div></div></button>
    </div></div>
    <div className="sh"><h2 style={{ fontSize: 13, color: 'var(--label-2)', fontWeight: 500 }}>حول</h2></div>
    <div className="section"><div className="card">
      <div className="row"><div className="main"><div className="title">مصادر البيانات</div><div className="meta">Polymarket Gamma/CLOB · CoinGecko</div></div></div>
      <div className="row"><div className="main"><div className="title">الإصدار</div></div><span className="num" style={{ color: 'var(--label-2)' }}>1.0.0</span></div>
    </div></div>
    <div className="note">التطبيق للمتابعة والتعلّم فقط. لا يقدّم نصائح استثمارية ولا ينفّذ صفقات حقيقية.</div>
  </div>
}

const TABS = [['home', 'الرئيسية', 'home'], ['poly', 'بولي ماركت', 'poly'], ['crypto', 'الكربتو', 'coin'], ['trades', 'الصفقات', 'trades'], ['settings', 'الإعدادات', 'gear']]
export default function App() {
  const [tab, setTab] = useState(() => (location.hash.slice(1) in Object.fromEntries(TABS) ? location.hash.slice(1) : 'home'))
  const [market, setMarket] = useState(null), [coin, setCoin] = useState(null)
  const [trades, setTrades] = useTrades()
  useEffect(() => { history.replaceState(null, '', '#' + tab) }, [tab])
  const go = (t, o = {}) => { setTab(t); setMarket(o.market || null); setCoin(o.coin || null) }
  const addTrade = (t) => setTrades(x => [t, ...x])
  return <div className="stage"><div className="app">
    {tab === 'home' && <Home go={go} trades={trades} />}
    {tab === 'poly' && <Poly open={setMarket} />}
    {tab === 'crypto' && <Crypto open={setCoin} />}
    {tab === 'trades' && <Trades trades={trades} setTrades={setTrades} />}
    {tab === 'settings' && <Settings setTrades={setTrades} />}
    {market && <MarketDetail m={market} onBack={() => setMarket(null)} addTrade={addTrade} />}
    {coin && <CoinDetail c={coin} onBack={() => setCoin(null)} />}
    {!market && !coin && <nav className="tabbar">{TABS.map(([k, l, ic]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}><Icon n={ic} s={25} w={tab === k ? 2.1 : 1.7} />{l}</button>)}</nav>}
  </div></div>
}
