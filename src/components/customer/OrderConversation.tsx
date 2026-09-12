import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from '../../lib/customer';
import { usePortalAuth } from '../../auth/PortalAuth';
type Message={id:string;body:string;from_bakery:boolean;created_at:string};
export default function OrderConversation({orderId}:{orderId:string}){
 const {user}=usePortalAuth();const [messages,setMessages]=useState<Message[]>([]);const [body,setBody]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 useEffect(()=>{if(window.location.hash==='#conversation'){const frame=requestAnimationFrame(()=>document.getElementById('conversation')?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame);}},[orderId]);
 const load=useCallback(async()=>{const {data,error}=await supabase.from('order_messages').select('id,body,from_bakery,created_at').eq('order_id',orderId).order('created_at',{ascending:false}).limit(200);if(error)setError(errorMessage(error));else {setMessages((data||[]).reverse());setError('');}setLoading(false);},[orderId]);
 useEffect(()=>{void load();const interval=setInterval(()=>{if(document.visibilityState==='visible')void load();},15000);return()=>clearInterval(interval);},[load]);
 async function send(e:FormEvent){e.preventDefault();if(!body.trim())return;setBusy(true);setError('');setNotice('');try{const {error}=await supabase.from('order_messages').insert({order_id:orderId,sender_id:user?.id,body:body.trim()});if(error)throw error;setBody('');setNotice('Message sent.');await load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <section id="conversation" className="customer-panel"><div className="customer-section-heading"><h2>Conversation</h2><button onClick={load} className="customer-text-button">Refresh</button></div><p className="customer-small">Keep the details together here. Customer messages notify the bakery by email and enabled device notifications. Bakery replies appear here in the portal. Showing the latest 200 messages.</p>
 {loading?<p role="status">Loading messages…</p>:messages.length?<ol className="customer-messages">{messages.map(m=><li className={m.from_bakery?'bakery-reply':''} key={m.id}><div><strong>{m.from_bakery?'Sugar Mama':'Customer'}</strong><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString('en-AU')}</time></div><p>{m.body}</p></li>)}</ol>:<p>No messages yet. Start the conversation below.</p>}
 <form onSubmit={send}><label>Your message<textarea rows={3} required maxLength={4000} value={body} onChange={e=>setBody(e.target.value)}/></label>{error&&<p className="customer-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<button className="customer-button" disabled={busy||!body.trim()}>{busy?'Sending…':'Send message'}</button></form></section>;
}
