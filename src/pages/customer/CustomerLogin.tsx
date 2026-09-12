import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePortalAuth } from '../../auth/PortalAuth';
import { errorMessage } from '../../lib/customer';
const providers=['apple','google','facebook'] as const;
export default function CustomerLogin(){
 const {pathname,hash,search,state}=useLocation();const navigate=useNavigate();const {user,loading,refresh}=usePortalAuth();
 const setting=pathname.endsWith('set-password');const callback=pathname.endsWith('callback');
 const [mode,setMode]=useState<'login'|'signup'|'reset'>(state?.mode==='signup'?'signup':'login');const [email,setEmail]=useState(typeof state?.email==='string'?state.email:'');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [enabled,setEnabled]=useState<(typeof providers[number])[]>([]);const [signupEnabled,setSignupEnabled]=useState(false);
 const callbackError=new URLSearchParams(hash.slice(1)).get('error_description')||new URLSearchParams(search).get('error_description');
 useEffect(()=>{const controller=new AbortController();fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:import.meta.env.VITE_SUPABASE_ANON_KEY},signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{setEnabled(providers.filter(p=>data.external?.[p]));setSignupEnabled(!data.disable_signup);}).catch(()=>{});return()=>controller.abort();},[]);
 useEffect(()=>{if(!loading&&user?.email_confirmed_at&&!setting&&mode==='login'&&!callbackError)navigate('/account',{replace:true});},[user,loading,setting,mode,navigate,callbackError]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{
  if(setting){if(!user)throw Error('This link has expired. Request a new password reset.');if(password!==confirm)throw Error('The passwords do not match.');const {error}=await supabase.auth.updateUser({password});if(error)throw error;setPassword('');navigate('/account',{replace:true});}
  else if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${location.origin}/account/set-password`});if(error)throw error;setNotice('If this email has an account, a reset link is on its way. Check your inbox and junk folder.');}
  else if(mode==='signup'){if(password!==confirm)throw Error('The passwords do not match.');const {error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:`${location.origin}/account/callback`}});if(error)throw error;setPassword('');setConfirm('');setNotice('Check your inbox to confirm your email, then sign in. If you already have an account, sign in or reset your password.');}
  else{const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;refresh();navigate('/account',{replace:true});}
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function social(provider:typeof providers[number]){setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:`${location.origin}/account/callback`}});if(error)throw error;}catch(e){setError(errorMessage(e));setBusy(false);}}
 return <div className="customer-portal customer-auth"><aside><Link to="/" className="customer-brand">Sugar Mama<span>COOKIE CO.</span></Link><div><p className="customer-kicker">MADE FOR YOUR MOMENTS</p><h1>A little cookie.<br/>All your details.</h1><p>Your quotes, orders and conversations with Faith, together in one place.</p></div><p>ALBURY–WODONGA · BAKED LOCAL</p></aside><main><Link to="/">← Back to the bakery</Link><div className="customer-auth-form"><p className="customer-kicker">YOUR COOKIE CORNER</p><h2>{setting?'A fresh start.':mode==='signup'?'Make yourself at home.':mode==='reset'?'Forgot your password?':'Welcome back.'}</h2><p>{setting?'Choose a new password with at least 12 characters.':mode==='signup'?'Create an account using the email you use for your orders.':'Sign in to keep an eye on your next delicious occasion.'}</p>
 {(error||callbackError)&&<p className="customer-error" role="alert">{error||callbackError}</p>}{notice&&<p className="customer-notice" role="status">{notice}</p>}
 {callback&&loading?<p role="status">Finishing sign-in…</p>:<>
 {callback&&!user&&!loading&&<p role="status">If your sign-in link expired, sign in below or request a password reset.</p>}
 {!setting&&mode!=='reset'&&enabled.length>0&&<div className="customer-social">{enabled.map(p=><button key={p} type="button" className={p==='google'?'customer-google-button':undefined} disabled={busy} onClick={()=>social(p)}>{p==='google'&&<img src="/branding/google-g.png" width="20" height="20" alt="" aria-hidden="true"/>}Continue with {p[0].toUpperCase()+p.slice(1)}</button>)}<span>or use your email</span></div>}
 <form onSubmit={submit}>
 {!setting&&<label>Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {(setting||mode!=='reset')&&<label>Password<input type="password" autoComplete={setting||mode==='signup'?'new-password':'current-password'} required minLength={setting||mode==='signup'?12:undefined} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 {(setting||mode==='signup')&&<label>Confirm password<input type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}
 <button className="customer-button" disabled={busy||(setting&&(loading||!user))}>{busy?'Please wait…':setting?'Save password':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</button></form>
 {!setting&&<div className="customer-auth-links"><button onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setNotice('');}}>{mode==='reset'?'Back to sign in':'Forgot your password?'}</button>{signupEnabled&&<button onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('');setNotice('');}}>{mode==='signup'?'Already have an account? Sign in':'New here? Create an account'}</button>}</div>}
 {setting&&!user&&!loading&&<Link to="/account/login">Return to sign in to request a new link</Link>}
 </>}
 <p className="customer-small">Use the same email as your order to see previous quotes. If you use Apple’s Hide My Email, contact Faith to connect orders placed under another address.</p></div></main></div>;
}
