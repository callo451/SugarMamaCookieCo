import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { customerDate,errorMessage,openInvoice,type InvoiceDocument } from '../../lib/customer';
export default function OrderInvoices({orderId,staff=false}:{orderId:string;staff?:boolean}){
 const [documents,setDocuments]=useState<InvoiceDocument[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [title,setTitle]=useState('');const [file,setFile]=useState<File|null>(null);
 const load=useCallback(async()=>{const {data,error}=await supabase.from('order_documents').select('*').eq('order_id',orderId).order('created_at',{ascending:false});if(error)setError(errorMessage(error));else setDocuments(data||[]);setLoading(false);},[orderId]);useEffect(()=>{void load();},[load]);
 async function download(doc:InvoiceDocument){setBusy(true);setError('');try{await openInvoice(doc);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!file)return;const form=e.currentTarget;setBusy(true);setError('');const path=`${orderId}/${crypto.randomUUID()}.pdf`;try{
  if(file.size>10*1024*1024)throw Error('Please choose a PDF smaller than 10 MB.');
  if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('Please choose a valid PDF document.');
  const result=await supabase.storage.from('customer-invoices').upload(path,file,{contentType:'application/pdf'});if(result.error)throw result.error;
  const {error}=await supabase.from('order_documents').insert({order_id:orderId,title:title.trim(),storage_path:path});if(error){await supabase.storage.from('customer-invoices').remove([path]);throw error;}
  setTitle('');setFile(null);form.reset();await load();
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function remove(doc:InvoiceDocument){if(!window.confirm(`Remove ${doc.title} from the customer portal?`))return;setBusy(true);setError('');try{const {error}=await supabase.from('order_documents').delete().eq('id',doc.id);if(error)throw error;await supabase.storage.from('customer-invoices').remove([doc.storage_path]);await load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <section className="customer-panel"><h2>Invoices</h2>{error&&<p role="alert" className="customer-error">{error}</p>}{loading?<p role="status">Loading invoices…</p>:documents.length?documents.map(d=><div className="customer-document" key={d.id}><div><strong>{d.title}</strong><p>{customerDate(d.created_at)}</p></div><button className="customer-button secondary" disabled={busy} onClick={()=>download(d)}>Download PDF</button>{staff&&<button className="customer-text-button" disabled={busy} onClick={()=>remove(d)}>Remove</button>}</div>):<p>No invoice has been attached to this order yet.</p>}
 {staff&&<form onSubmit={upload}><p className="customer-small">Attach an issued invoice. The customer linked to this order can download it privately.</p><label>Invoice number / title<input required maxLength={150} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Invoice PDF (up to 10 MB)<input required type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="customer-button" disabled={busy||!file||!title.trim()}>{busy?'Please wait…':'Attach invoice'}</button></form>}</section>;
}
