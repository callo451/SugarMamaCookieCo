import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { statusLabel } from '../../lib/portal';
import { addDays, businessToday, cookieCount, dayLabel, monday, nextStage, productionGroups, type ProductionOrder } from '../../lib/production';

const fields = 'id,display_order_id,customer_name,status,collection_date,quantity,description,shape,special_fonts,special_instructions';
export default function Production({ calendar = false }: { calendar?: boolean }) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [week, setWeek] = useState(() => monday(businessToday()));
  const generation = useRef(0);
  const today = businessToday();
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const all: ProductionOrder[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('orders').select(fields).in('status', ['pending', 'confirmed', 'in_progress']).order('id').range(offset, offset + 499);
        if (error) throw error;
        all.push(...(data || []) as ProductionOrder[]);
        if (!data || data.length < 500) break;
      }
      if (request === generation.current) setOrders(all);
    } catch { if (request === generation.current) setError('Could not load the schedule. Please try again.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  async function advance(order: ProductionOrder) {
    const next = nextStage[order.status];
    if (!next || saving) return;
    if (next.status === 'completed' && !window.confirm(`Mark ${order.display_order_id || order.customer_name} completed? It will leave the active production schedule.`)) return;
    setSaving(order.id); setNotice('');
    try {
      const { data, error } = await supabase.from('orders').update({ status: next.status }).eq('id', order.id).eq('status', order.status).select(fields).single();
      if (error || !data) throw error;
      setOrders(current => current.map(o => o.id === order.id ? data as ProductionOrder : o));
      setNotice(`${order.display_order_id || order.customer_name}: ${statusLabel(next.status)}.`);
    } catch { setNotice('Could not update this order. Refresh the schedule before trying again.'); }
    finally { setSaving(null); }
  }
  const groups = productionGroups(orders);
  const active = groups.flatMap(([, rows]) => rows);
  const overdue = active.filter(o => o.collection_date && o.collection_date < today);
  const unscheduled = active.filter(o => !o.collection_date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const otherOverdue = overdue.filter(order => !days.includes(order.collection_date!));
  function card(order: ProductionOrder) {
    return <article className="kitchen-card" key={order.id}>
      <div className="kitchen-card-top"><Link to={`/admin/orders/${order.id}`}>{order.display_order_id || order.id.slice(0, 8)}</Link><span>{order.quantity || 0} cookies</span></div>
      <h3>{order.customer_name}</h3><span className={`status-badge ${order.status}`}>{statusLabel(order.status)}</span>
      <p>{order.description || 'No design description yet.'}</p>
      {order.shape && <p><strong>Shape:</strong> {order.shape}</p>}
      {order.special_fonts && <p><strong>Text & fonts:</strong> {order.special_fonts}</p>}
      {order.special_instructions && <p className="kitchen-note"><strong>Instructions:</strong> {order.special_instructions}</p>}
      <div className="kitchen-actions"><Link to={`/admin/orders/${order.id}`}>View / edit</Link><button disabled={!!saving || loading} onClick={() => advance(order)}>{saving === order.id ? 'Saving…' : nextStage[order.status]?.label}</button></div>
    </article>;
  }
  return <div className="kitchen-page">
    <div className="page-heading"><div><p className="eyebrow">THE KITCHEN</p><h1>{calendar ? 'Collection calendar' : 'Production board'}</h1><p className="muted">{calendar ? 'Plan the week around your active collections.' : 'What to make, when it’s due, and the details that matter.'}</p></div><div className="kitchen-tools"><button className="studio-button secondary" disabled={loading || !!saving} onClick={load}><RefreshCw size={16}/>Refresh</button><button className="studio-button" disabled={loading || !!error || !active.length} onClick={() => window.print()}><Printer size={16}/>Print kitchen sheet</button></div></div>
    <div className="kitchen-summary"><span><strong>{active.length}</strong> active orders</span><span><strong>{cookieCount(active)}</strong> cookies</span><span><strong>{overdue.length}</strong> overdue</span><span><strong>{unscheduled.length}</strong> without a date</span></div>
    <p className="kitchen-explainer">Dates use Melbourne time. Completed and cancelled orders are excluded. Status changes here do not email the customer.</p>
    {notice && <p role="status" className="kitchen-feedback">{notice}</p>}
    {error ? <div className="studio-empty" role="alert">{error}</div> : loading ? <div className="studio-empty" role="status">Loading production schedule…</div> : <>
      {calendar ? <>
        <div className="kitchen-week"><button aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft/></button><h2>{dayLabel(week)} – {dayLabel(days[6])}</h2><button aria-label="Next week" onClick={() => setWeek(addDays(week, 7))}><ChevronRight/></button><button onClick={() => setWeek(monday(today))}>This week</button></div>
        <div className="collection-week">{days.map(day => { const rows = active.filter(o => o.collection_date === day); return <section key={day} className={day === today ? 'is-today' : ''}><header><h2>{dayLabel(day)}{day === today && ' · Today'}</h2><p>{rows.length} orders · {cookieCount(rows)} cookies</p></header>{rows.length ? rows.map(card) : <p className="kitchen-free">No collections</p>}</section>; })}</div>
        {otherOverdue.length > 0 && <section className="kitchen-group"><h2>Overdue outside this week · {otherOverdue.length}</h2><p>Still active with a collection date before today.</p><div className="kitchen-cards">{otherOverdue.map(card)}</div></section>}
        {unscheduled.length > 0 && <section className="kitchen-group"><h2>Needs a collection date · {unscheduled.length}</h2><p>Open an order to set its date.</p><div className="kitchen-cards">{unscheduled.map(card)}</div></section>}
      </> : groups.length ? groups.map(([day, rows]) => <section className="kitchen-group" key={day || 'unscheduled'}><div className="kitchen-group-heading"><h2>{day ? dayLabel(day) : 'Needs a collection date'}{day && day < today && <span className="kitchen-overdue">Overdue</span>}{day === today && <span>Today</span>}</h2><p>{rows.length} orders · {cookieCount(rows)} cookies</p></div><div className="kitchen-cards">{rows.map(card)}</div></section>) : <div className="studio-empty"><h3>The kitchen is all caught up.</h3><p>Active orders will appear here as they come in.</p><Link to="/admin/orders">View all orders</Link></div>}
    </>}
  </div>;
}
