import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { aggregateCustomers, type DirectoryAccount, type DirectoryOrder } from '../../lib/customerDirectory';
import { statusLabel } from '../../lib/portal';
const money=(value:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(value);
const date=(value:string)=>new Date(value).toLocaleDateString('en-AU');
export default function Customers(){
 const [accounts,setAccounts]=useState<DirectoryAccount[]>([]),[orders,setOrders]=useState<DirectoryOrder[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[expanded,setExpanded]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError('');try{
  const nextAccounts:DirectoryAccount[]=[],nextOrders:DirectoryOrder[]=[];
  for(let offset=0;;offset+=500){const {data,error}=await supabase.rpc('customer_directory_accounts',{page_offset:offset});if(error)throw error;nextAccounts.push(...data);if(data.length<500)break;}
  for(let offset=0;;offset+=500){const {data,error}=await supabase.from('orders').select('id,customer_user_id,customer_email,customer_name,customer_phone,created_at,status,total_amount,description,display_order_id').order('id').range(offset,offset+499);if(error)throw error;nextOrders.push(...data);if(data.length<500)break;}
  setAccounts(nextAccounts);setOrders(nextOrders);
 }catch{setError('Could not load the customer directory. Please try again.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const customers=useMemo(()=>aggregateCustomers(accounts,orders),[accounts,orders]);
 const portal=accounts.filter(a=>!a.is_team),guests=customers.filter(c=>!c.account);
 const shown=customers.filter(c=> (filter==='all'||(filter==='accounts'&&c.account&&!c.account.is_team)||(filter==='guests'&&!c.account)||(filter==='unverified'&&c.account&&!c.account.is_team&&!c.account.verified)) && `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase().trim()));
 return <div className="directory-page"><header className="page-heading"><div><p className="eyebrow">THE PEOPLE BEHIND THE ORDERS</p><h1>Customers</h1><p className="muted">Portal accounts and guest customers, together in your order book.</p></div><button className="studio-button secondary" disabled={loading} onClick={load}><RefreshCw size={16}/>Refresh</button></header>
 {error?<div className="studio-empty" role="alert">{error}</div>:loading?<div className="studio-empty" role="status">Loading customers…</div>:<>
 <div className="directory-summary"><div><span>Portal accounts</span><strong>{portal.length}</strong></div><div><span>Awaiting verification</span><strong>{portal.filter(a=>!a.verified).length}</strong></div><div><span>Guest customers</span><strong>{guests.length}</strong></div><div><span>Completed-order value</span><strong>{money(customers.reduce((n,c)=>n+c.completedValue,0))}</strong></div></div>
 <p className="directory-note">Team logins are excluded from portal account counts. Completed-order value excludes quotes and cancelled orders; it does not confirm payment.</p>
 <div className="directory-tools"><label><Search size={16}/><input aria-label="Search customers" placeholder="Search name, email or phone" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filter customers" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All customers</option><option value="accounts">Portal accounts</option><option value="guests">Guest customers</option><option value="unverified">Awaiting verification</option></select><span>{shown.length} results</span></div>
 <div className="studio-panel directory-table"><table><thead><tr><th>Customer</th><th>Account</th><th>Quotes</th><th>Orders</th><th>Completed value</th><th>Latest order</th></tr></thead><tbody>{shown.map(c=><Fragment key={c.key}><tr><td><button className="directory-name" aria-expanded={expanded===c.key} onClick={()=>setExpanded(expanded===c.key?null:c.key)}>{expanded===c.key?<ChevronDown size={16}/>:<ChevronRight size={16}/>}<span><strong>{c.name||c.email||'Customer account'}</strong><small>{c.name?c.email:''}</small></span></button></td><td><span className="directory-account">{c.account?.is_team?'Team account':c.account?c.account.verified?'Verified':'Awaiting verification':'Guest'}</span></td><td>{c.quotes}</td><td>{c.orderCount}</td><td>{money(c.completedValue)}</td><td>{c.orders[0]?date(c.orders[0].created_at):'No orders yet'}</td></tr>{expanded===c.key&&<tr><td colSpan={6} className="directory-row-wrap"><div className="directory-detail"><p>{c.phone||'No phone supplied'}{c.account&&` · Account created ${date(c.account.joined_at)}`}{c.cancelled>0&&` · ${c.cancelled} cancelled`}</p>{c.orders.length?<ul>{c.orders.map(o=><li key={o.id}><Link to={`/admin/orders/${o.id}`}>{o.display_order_id||o.id.slice(0,8)}</Link><span>{statusLabel(o.status)}</span><span>{o.description}</span><strong>{money(Number(o.total_amount))}</strong></li>)}</ul>:<p>This customer has created an account but has not requested a quote or placed an order.</p>}</div></td></tr>}</Fragment>)}</tbody></table>{!shown.length&&<div className="studio-empty">No customers match this view.</div>}</div></>}
 </div>;
}
