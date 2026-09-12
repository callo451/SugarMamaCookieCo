import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { usePortalAuth } from '../../auth/PortalAuth';
import { supabase } from '../../lib/supabase';
import { errorMessage } from '../../lib/customer';
function AccountContent({userId}:{userId:string}){
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;supabase.rpc('claim_customer_orders').then(({error})=>{if(live){setError(error?errorMessage(error):'');setReady(!error);}});return()=>{live=false;};},[userId,attempt]);
 return error?<div className="customer-panel"><p role="alert">{error}</p><button className="customer-button" onClick={()=>setAttempt(a=>a+1)}>Try again</button></div>:ready?<Outlet/>:<p role="status">Finding your orders…</p>;
}
export default function CustomerLayout(){
 const {user,loading}=usePortalAuth();const [error,setError]=useState('');
 if(loading)return <div className="customer-portal customer-loading" role="status">Opening your cookie corner…</div>;
 if(!user)return <Navigate to="/account/login" replace/>;
 async function logout(){const {error}=await supabase.auth.signOut();if(error)setError(errorMessage(error));}
 return <div className="customer-portal"><header className="customer-header"><Link className="customer-brand" to="/">Sugar Mama<span>COOKIE CO.</span></Link><nav aria-label="Customer navigation"><NavLink to="/account" end>My orders & quotes</NavLink><NavLink to="/account/quote">Request a quote</NavLink><button onClick={logout}>Sign out</button></nav></header><main className="customer-main">{error&&<p role="alert">{error}</p>}{!user.email_confirmed_at?<div className="customer-panel"><h1>Check your inbox.</h1><p>Please confirm your email before opening your orders. Then sign out and sign in again.</p></div>:<AccountContent key={user.id} userId={user.id}/>}</main><footer className="customer-footer"><span>Baked local. Made personal.</span><Link to="/#contact">Contact Sugar Mama</Link></footer></div>;
}
