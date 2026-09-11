import { useState } from 'react';
import { supabase } from '../lib/supabase';
const faqs = [
 ['How much will my cookies cost?', 'Use the quote builder to choose your quantity and design details and see an estimate. We’ll confirm the final price and availability before your order is booked.'],
 ['How far ahead should I order?', 'Allow at least two weeks for custom designs, or one week for standard orders. If your event is sooner, contact us to check availability.'],
 ['Can I collect or have them delivered?', 'We serve the Albury–Wodonga region. Contact us to arrange collection or local delivery, and to discuss options if you’re further away.'],
 ['Can I request a particular theme?', 'Yes. Include your colours, wording, shapes and occasion in your quote request. The gallery is a good starting point for ideas.'],
 ['What about allergies or dietary requirements?', 'Please tell us about any allergies or dietary requirements before ordering so we can discuss whether your request can be accommodated.'],
];
export default function ContactForm() {
 const [state,setState]=useState<'idle'|'sending'|'sent'|'error'>('idle');
 const [form,setForm]=useState({name:'',email:'',message:''});
 async function submit(e:React.FormEvent) {e.preventDefault();setState('sending');try { const {error}=await supabase.functions.invoke('send-contact-message',{body:{name:form.name.trim(),email:form.email.trim(),message:form.message.trim()}});if(error)throw error;setState('sent');setForm({name:'',email:'',message:''});}catch{setState('error');}}
 return <section className="bakery-wrap bakery-section bakery-contact" id="contact"><div><p className="bakery-kicker">BEFORE YOU ORDER</p><h2>A few useful things.</h2><div className="bakery-faq">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div><div className="bakery-contact-form"><p className="bakery-kicker">SAY HELLO</p><h2>What’s the occasion?</h2><p>Questions, an idea, or something a bit out of the ordinary? Send Faith a note.</p>{state==='sent'?<div role="status" className="bakery-success"><h3>Thanks for getting in touch.</h3><p>Your message has been sent. We’ll reply to the email address you provided.</p><button className="bakery-text-link" onClick={()=>setState('idle')}>Send another message</button></div>:<form onSubmit={submit}>
 <label htmlFor="contact-name">Your name</label><input id="contact-name" autoComplete="name" required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
 <label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" autoComplete="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
 <label htmlFor="contact-message">Your message</label><textarea id="contact-message" required rows={4} maxLength={5000} placeholder="Your date, quantity and any ideas you have…" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
 {state==='error'&&<p role="alert">Your message couldn’t be sent. Please try again or email us below.</p>}<button disabled={state==='sending'} className="bakery-button">{state==='sending'?'Sending…':'Send your message'}</button></form>}
 <a className="bakery-email" href="mailto:hello@sugarmamacookieco.com.au">hello@sugarmamacookieco.com.au</a></div></section>;
}
