import InspirationPhotos from '../../components/customer/InspirationPhotos';
import { useEffect, useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { customerDate,customerOrderFields,errorMessage,type CustomerOrder } from '../../lib/customer';
import { money,statusLabel } from '../../lib/portal';
import { generateOrderPdf } from '../../utils/generateOrderPdf';
import { usePortalAuth } from '../../auth/PortalAuth';
import OrderConversation from '../../components/customer/OrderConversation';
import OrderInvoices from '../../components/customer/OrderInvoices';
export default function CustomerOrderDetail(){
 const {id}=useParams();const {user}=usePortalAuth();const [order,setOrder]=useState<CustomerOrder|null>(null);const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let live=true;setOrder(null);setLoading(true);setError('');supabase.from('orders').select(customerOrderFields).eq('id',id).eq('customer_user_id',user?.id).maybeSingle().then(({data,error})=>{if(live){setOrder(data as CustomerOrder|null);setError(error?errorMessage(error):'');setLoading(false);}});return()=>{live=false;};},[id,user?.id,revision]);
 async function download(){if(!order)return;setBusy(true);try{const {data,error}=await supabase.from('order_items').select('id,order_id,quantity,unit_price,description').eq('order_id',order.id);if(error)throw error;await generateOrderPdf(order,data||[]);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 if(loading)return <p role="status">Opening your order…</p>;
 if(!order)return <div className="customer-panel"><h1>Order unavailable</h1><p>{error||'This order could not be found in your account.'}</p><Link to="/account">Back to your orders</Link></div>;
 return <><div className="customer-section-heading"><Link to="/account">← Your orders & quotes</Link><button className="customer-text-button" onClick={()=>setRevision(r=>r+1)}>Refresh order</button></div><div className="customer-heading"><div><p className="customer-kicker">{order.display_order_id||order.id.slice(0,8)}</p><h1>{order.status==='pending'?'Your cookie quote.':'Your cookie order.'}</h1><p>{statusLabel(order.status)}</p></div>{<button className="customer-button" disabled={busy} onClick={download}>{busy?'Preparing…':`Download ${order.status==='pending'?'quote':'order'} PDF`}</button>}</div>{error&&<p role="alert" className="customer-error">{error}</p>}
 <div className="customer-detail-grid"><section className="customer-panel"><h2>The delicious details</h2><p className="customer-description">{order.description}</p><dl className="customer-details"><div><dt>Quantity</dt><dd>{order.quantity} cookies</dd></div><div><dt>Collection</dt><dd>{customerDate(order.collection_date)}</dd></div><div><dt>Shape</dt><dd>{order.shape||'To be discussed'}</dd></div><div><dt>Text & fonts</dt><dd>{order.special_fonts||'To be discussed'}</dd></div><div><dt>Instructions</dt><dd>{order.special_instructions||'None added'}</dd></div></dl><div className="customer-total"><span>{order.status==='pending'?'Quote total':'Order total'} (AUD)</span><strong>{money(order.total_amount)}</strong></div><p className="customer-small">{order.status==='pending'?'Faith will confirm design, availability and the final price. A quote request does not reserve your date.':'Contact Faith below about collection or any changes to your order.'}</p></section><OrderInvoices key={`invoices-${order.id}`} orderId={order.id}/></div><InspirationPhotos key={`photos-${order.id}`} orderId={order.id}/><OrderConversation key={order.id} orderId={order.id}/></>;
}
