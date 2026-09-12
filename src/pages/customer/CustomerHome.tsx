import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { customerDate, customerOrderFields, errorMessage, openInvoice, type CustomerOrder, type InvoiceDocument } from '../../lib/customer';
import { usePortalAuth } from '../../auth/PortalAuth';
import { money,statusLabel } from '../../lib/portal';
export default function CustomerHome(){
 const {user}=usePortalAuth();
 const [orders,setOrders]=useState<CustomerOrder[]>([]);const [invoices,setInvoices]=useState<InvoiceDocument[]>([]);const [filter,setFilter]=useState('all');const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [downloading,setDownloading]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{
 const [o,d]=await Promise.all([supabase.from('orders').select(customerOrderFields).eq('customer_user_id',user?.id).order('created_at',{ascending:false}).limit(200),supabase.from('order_documents').select('*,orders!inner(customer_user_id)').eq('orders.customer_user_id',user?.id).order('created_at',{ascending:false}).limit(200)]);if(o.error)throw o.error;if(d.error)throw d.error;setOrders(o.data as CustomerOrder[]);setInvoices(d.data||[]);
 }catch(e){setError(errorMessage(e));}finally{setLoading(false);}},[user?.id]);
 useEffect(()=>{void load();},[load]);
 async function download(d:InvoiceDocument){setDownloading(d.id);try{await openInvoice(d);}catch(e){setError(errorMessage(e));}finally{setDownloading('');}}
 const shown=orders.filter(o=>filter==='all'||(filter==='quotes'?o.status==='pending':o.status!=='pending'));
 return <><div className="customer-heading"><div><p className="customer-kicker">YOUR COOKIE CORNER</p><h1>Good things<br/>are in the making.</h1><p>Follow your orders, talk through the details and plan your next occasion.</p></div><Link to="/account/quote" className="customer-button">Plan some cookies ↗</Link></div><div className="customer-tabs" role="group" aria-label="Filter your records">{[['all','Everything'],['quotes','Quotes'],['orders','Orders'],['invoices','Invoices']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}<button onClick={load} disabled={loading}>Refresh</button></div>
 {error&&<p role="alert" className="customer-error">{error}</p>}{loading?<p role="status">Loading your details…</p>:!error&&<>
 {filter==='invoices'?<div className="customer-panel"><h2>Your invoices</h2>{invoices.length?invoices.map(d=><div className="customer-document" key={d.id}><div><strong>{d.title}</strong><p>{customerDate(d.created_at)} · <Link to={`/account/orders/${d.order_id}`}>View order</Link></p></div><button className="customer-button secondary" disabled={!!downloading} onClick={()=>download(d)}>{downloading===d.id?'Downloading…':'Download PDF'}</button></div>):<p>Invoices will appear here when Faith attaches them to your order.</p>}</div>:shown.length?<div className="customer-order-grid">{shown.map(o=><Link className="customer-order-card" key={o.id} to={`/account/orders/${o.id}`}><div className="customer-card-top"><span>{o.display_order_id||o.id.slice(0,8)}</span><span>{statusLabel(o.status)}</span></div><h2>{o.category?o.category.replace(/-/g,' '):'Your custom cookies'}</h2><p>{o.description||'Let’s work out the details together.'}</p><dl><div><dt>Quantity</dt><dd>{o.quantity} cookies</dd></div><div><dt>Collection</dt><dd>{customerDate(o.collection_date)}</dd></div></dl><div className="customer-card-bottom"><strong>{money(o.total_amount)}</strong><span>Details & messages →</span></div></Link>)}</div>:<div className="customer-panel customer-empty"><h2>Your next occasion starts here.</h2><p>No {filter==='all'?'orders or quotes':filter} to show yet. Request a quote and Faith will help with the details.</p><Link className="customer-button" to="/account/quote">Request a quote</Link></div>}
 <p className="customer-small">Showing up to 200 recent records. Missing an older order? Contact Faith with its reference and the email used to order. Prices and collection dates are confirmed by the bakery.</p></>}
 </>;
}
