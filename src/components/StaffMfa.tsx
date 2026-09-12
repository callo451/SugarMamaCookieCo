import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export default function StaffMfa({onVerified}:{onVerified:()=>void}) {
 const [factor,setFactor]=useState('');
 const [qr,setQr]=useState('');
 const [secret,setSecret]=useState('');
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 async function load() {
  setError('');setLoading(true);
  try {
   const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
   setFactor(data.totp.find(f=>f.status==='verified')?.id || '');
  }catch{setError('Could not load two-step verification. Please try again.');}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function enroll() {
  setBusy(true);setError('');
  try {
   const {data:factors,error:listError}=await supabase.auth.mfa.listFactors();if(listError)throw listError;
   // Only clear incomplete enrollment attempts, never an existing verified factor.
   for(const f of factors.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified')) {
    const {error}=await supabase.auth.mfa.unenroll({factorId:f.id});if(error)throw error;
   }
   const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Sugar Mama workspace',issuer:'Sugar Mama Cookie Co'});
   if(error)throw error;setFactor(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret);
  }catch{setError('Could not start setup. Please try again.');}finally{setBusy(false);}
 }
 async function verify(event:FormEvent) {
  event.preventDefault();setBusy(true);setError('');
  try {
   const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});if(error)throw error;
   setQr('');setSecret('');setCode('');onVerified();
  }catch{setError('That code could not be verified. Enter the latest code from your authenticator.');}finally{setBusy(false);}
 }
 return <div className="portal-auth-status"><section style={{maxWidth:480,width:'100%'}}>
  <p className="eyebrow">SUGAR MAMA / PRIVATE WORKSPACE</p>
  <h1>Two-step verification</h1>
  <p>Protect your bakery workspace with a code from your authenticator app.</p>
  {loading?<p role="status">Checking your authenticator…</p>:factor?<form onSubmit={verify}>
   {qr&&<><p>Scan this QR code in your authenticator app, then enter its six-digit code.</p><img src={qr} alt="Authenticator setup QR code" width={220} height={220}/><details><summary>Enter a setup key instead</summary><code style={{overflowWrap:'anywhere'}}>{secret}</code></details></>}
   <label htmlFor="mfa-code">Authenticator code</label><input id="mfa-code" className="studio-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
   <button className="studio-button" disabled={busy||code.length!==6}>{busy?'Verifying…':'Verify and continue'}</button>
  </form>:<button className="studio-button" disabled={busy||!!error} onClick={enroll}>{busy?'Preparing…':'Set up authenticator'}</button>}
  {error&&<p role="alert">{error} <button className="studio-button secondary" onClick={load}>Try again</button></p>}
  <p>If you lose access to your authenticator, contact the project administrator to verify your identity and reset the factor.</p>
  <button className="studio-button secondary" onClick={()=>supabase.auth.signOut()}>Sign out</button>
 </section></div>;
}
