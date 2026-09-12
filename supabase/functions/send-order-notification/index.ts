import { orderEmailHandler } from '../_shared/order-email.ts';
Deno.serve(orderEmailHandler('customer'));
