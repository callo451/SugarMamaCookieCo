export type ProductionOrder = {
  id: string; display_order_id?: string; customer_name: string; status: string;
  collection_date: string | null; quantity: number; description: string;
  shape: string; special_fonts: string; special_instructions: string;
};
export function businessToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function monday(day: string) {
  return addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
}
export const dayLabel = (day: string) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00Z`));
export function productionGroups(orders: ProductionOrder[]) {
  const groups = new Map<string, ProductionOrder[]>();
  for (const order of orders) {
    if (['completed', 'cancelled'].includes(order.status)) continue;
    const key = order.collection_date || '';
    groups.set(key, [...(groups.get(key) || []), order]);
  }
  return [...groups].sort(([a], [b]) => a ? b ? a.localeCompare(b) : -1 : 1);
}
export const cookieCount = (orders: ProductionOrder[]) => orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
export const nextStage: Record<string, { status: string; label: string }> = {
  pending: { status: 'confirmed', label: 'Confirm order' },
  confirmed: { status: 'in_progress', label: 'Start making' },
  in_progress: { status: 'completed', label: 'Mark completed' },
};
