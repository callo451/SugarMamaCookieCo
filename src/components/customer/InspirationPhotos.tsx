import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { errorMessage } from '../../lib/customer';
export default function InspirationPhotos({orderId}:{orderId:string}){
 const [photos,setPhotos]=useState<{url:string;name:string}[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;const urls:string[]=[];async function load(){setLoading(true);setError('');try{
 const {data:order,error}=await supabase.from('orders').select('inspiration_upload_token').eq('id',orderId).single();if(error)throw error;
 const folder=`${orderId}/${order.inspiration_upload_token}`;const {data, error:listError}=await supabase.storage.from('quote-inspiration').list(folder);if(listError)throw listError;
 const images=[];for(const file of data||[]){if(!/^[123]\.jpg$/.test(file.name))continue;const {data,error}=await supabase.storage.from('quote-inspiration').download(`${folder}/${file.name}`);if(error)throw error;const url=URL.createObjectURL(data);urls.push(url);images.push({url,name:`Inspiration photo ${file.name[0]}`});}
 if(live)setPhotos(images);
 }catch(e){if(live)setError(errorMessage(e));}finally{if(live)setLoading(false);else urls.forEach(URL.revokeObjectURL);}}void load();return()=>{live=false;urls.forEach(URL.revokeObjectURL);};},[orderId,attempt]);
 return <section className="customer-panel"><div className="customer-section-heading"><h2>Inspiration photos</h2><button className="customer-text-button" onClick={()=>setAttempt(n=>n+1)}>Refresh</button></div>{error&&<p role="alert" className="customer-error">{error}</p>}{loading?<p role="status">Loading photos…</p>:photos.length?<div className="inspiration-gallery">{photos.map(p=><a key={p.name} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.name}/><span>{p.name} ↗</span></a>)}</div>:!error&&<p>No inspiration photos attached.</p>}</section>;
}
