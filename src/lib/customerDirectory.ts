export type DirectoryAccount = { id: string; email: string | null; verified: boolean; joined_at: string; is_team: boolean };
export type DirectoryOrder = { id: string; customer_user_id: string | null; customer_email: string; customer_name: string; customer_phone?: string; created_at: string; status: string; total_amount: number; description: string; display_order_id?: string };
export type DirectoryCustomer = { key: string; email: string; name: string; phone: string; account?: DirectoryAccount; orders: DirectoryOrder[]; quotes: number; orderCount: number; cancelled: number; completedValue: number; lastActivity: string };
const normal = (email: string | null) => (email || '').trim().toLowerCase();
export function aggregateCustomers(accounts: DirectoryAccount[], orders: DirectoryOrder[]): DirectoryCustomer[] {
 const rows = new Map<string, DirectoryCustomer>();
 const byId = new Map(accounts.map(a => [a.id, a]));
 const verifiedEmails = new Map(accounts.filter(a => a.verified && a.email).map(a => [normal(a.email), a]));
 for (const account of accounts) rows.set(account.id, {key:account.id,email:account.email || '',name:'',phone:'',account,orders:[],quotes:0,orderCount:0,cancelled:0,completedValue:0,lastActivity:account.joined_at});
 for (const order of [...orders].sort((a,b) => b.created_at.localeCompare(a.created_at))) {
  // Persisted ownership wins. Email matching is a directory grouping only; it grants no order access.
  const account = order.customer_user_id ? byId.get(order.customer_user_id) : verifiedEmails.get(normal(order.customer_email));
  const key = account?.id || (order.customer_user_id ? `unavailable:${order.customer_user_id}` : normal(order.customer_email) ? `guest:${normal(order.customer_email)}` : `order:${order.id}`);
  let row = rows.get(key);
  if (!row) { row={key,email:order.customer_email || '',name:'',phone:'',orders:[],quotes:0,orderCount:0,cancelled:0,completedValue:0,lastActivity:order.created_at}; rows.set(key,row); }
  if (!row.orders.length) {row.name=order.customer_name || '';row.phone=order.customer_phone || '';}
  row.orders.push(order);
  if(order.status==='pending')row.quotes++; else if(order.status==='cancelled')row.cancelled++; else row.orderCount++;
  if(order.status==='completed')row.completedValue+=Number(order.total_amount || 0);
  if(order.created_at>row.lastActivity)row.lastActivity=order.created_at;
 }
 return [...rows.values()].filter(r=>!r.account?.is_team || r.orders.length>0).sort((a,b)=>b.lastActivity.localeCompare(a.lastActivity));
}
