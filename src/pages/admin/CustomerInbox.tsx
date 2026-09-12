import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { errorMessage } from '../../lib/customer';
type Thread={id:string;body:string;created_at:string;from_bakery:boolean;order_id:string;orders:{display_order_id:string;customer_name:string}|null};
export default function CustomerInbox(){
 const [threads,setThreads]=useState<Thread[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);setError('');const {data,error}=await supabase.from('order_messages').select('id,body,created_at,from_bakery,order_id,orders(display_order_id,customer_name)').order('created_at',{ascending:false}).limit(500);if(error)setError(errorMessage(error));else{const seen=new Set<string>();setThreads((data as unknown as Thread[]).filter(t=>{if(seen.has(t.order_id))return false;seen.add(t.order_id);return true;}));}setLoading(false);}
 useEffect(()=>{void load();},[]);
 return <div className="customer-portal customer-admin"><div className="customer-heading"><div><p className="customer-kicker">AT THE OTHER END OF THE COUNTER</p><h1>Customer messages</h1><p>Latest conversations, newest first. Open an order to reply.</p></div><button className="customer-button" onClick={load} disabled={loading}>Refresh</button></div>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading conversations…</p>:threads.length?<div className="customer-panel">{threads.map(t=><Link className="customer-inbox-row" key={t.id} to={`/admin/orders/${t.order_id}`}><div><strong>{t.orders?.customer_name||'Customer'} · {t.orders?.display_order_id||t.order_id.slice(0,8)}</strong><p>{t.body}</p></div><span>{t.from_bakery?'Bakery replied':'Customer message'}<small>{new Date(t.created_at).toLocaleString('en-AU')}</small></span></Link>)}</div>:<div className="customer-panel"><h2>No conversations yet.</h2><p>Customer messages will appear here when they contact you through an order.</p></div>}<p className="customer-small">Conversations from the latest 500 messages. Older messages remain available inside each order.</p></div>;
}
