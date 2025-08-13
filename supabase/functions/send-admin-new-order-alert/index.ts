import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables from Supabase secrets
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

// Constants
const ADMIN_EMAIL_TO = "hello@sugarmamacookieco.com.au";
const DEFAULT_SENDER_EMAIL = RESEND_FROM_EMAIL || "orders@sugarmamacookieco.com.au"; // Fallback if RESEND_FROM_EMAIL is not set
const ADMIN_NEW_ORDER_TEMPLATE_NAME = 'admin_new_order_alert';

console.log('Edge Function send-admin-new-order-alert started.');

const DEFAULT_ADMIN_NEW_ORDER_HTML_TEMPLATE = `
<html>
  <head>
    <title>New Order Received!</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
      .container { background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
      h1 { color: #4CAF50; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🎉 New Order Received! ({{ORDER_NUMBER}})</h1>
      <p>A new order has just been placed on Sugar Mama Cookie Co.</p>
      
      <h2>Order Details:</h2>
      <ul>
        <li><strong>Order Number:</strong> {{ORDER_NUMBER}}</li>
        <li><strong>Customer Name:</strong> {{customer_name}}</li>
        <li><strong>Customer Email:</strong> {{customer_email}}</li>
        <li><strong>Customer Phone:</strong> {{customer_phone}}</li>
        <li><strong>Order Date:</strong> {{order_date}}</li>
        <li><strong>Order Total:</strong> {{order_total}}</li>
        <li><strong>Delivery Option:</strong> {{delivery_option}}</li>
        <li><strong>Notes:</strong> {{order_notes}}</li>
      </ul>
      
      <h2>Items Ordered:</h2>
      {{order_items_table}}
      
      <p>Please log in to the admin panel to view the full order details and process it.</p>
      <p>Thank you!</p>
    </div>
  </body>
</html>
`.trim();

function generateOrderItemsTableHtml(items: any[] = []): string {
  if (!items || items.length === 0) {
    return '<p>No items information available for this order.</p>';
  }
  let table = '<table><thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total Price</th></tr></thead><tbody>';
  items.forEach(item => {
    const unitPrice = parseFloat(item.unit_price || 0);
    const quantity = parseInt(item.quantity || 0, 10);
    const totalPrice = unitPrice * quantity;
    table += `<tr>
                <td>${item.product_name || 'N/A'}</td>
                <td>${quantity}</td>
                <td>$${unitPrice.toFixed(2)}</td>
                <td>$${totalPrice.toFixed(2)}</td>
              </tr>`;
  });
  table += '</tbody></table>';
  return table;
}

async function getEmailTemplate(supabaseClient: any, templateName: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Fetching template: ${templateName}`);
  const { data, error } = await supabaseClient
    .from('email_templates')
    .select('html_content')
    .eq('name', templateName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error(`[${new Date().toISOString()}] Error fetching template ${templateName}:`, error);
    return DEFAULT_ADMIN_NEW_ORDER_HTML_TEMPLATE; // Fallback on error
  }
  if (!data || !data.html_content) {
    console.log(`[${new Date().toISOString()}] Template ${templateName} not found or content empty, using default.`);
    return DEFAULT_ADMIN_NEW_ORDER_HTML_TEMPLATE;
  }
  console.log(`[${new Date().toISOString()}] Template ${templateName} fetched successfully.`);
  return data.html_content;
}

Deno.serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !DEFAULT_SENDER_EMAIL) {
    console.error("[${new Date().toISOString()}] Missing one or more required environment variables or default sender email.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  try {
    const { orderData } = await req.json();
    console.log(`[${new Date().toISOString()}] Parsed orderData:`, JSON.stringify(orderData, null, 2));

    if (!orderData || !orderData.order_id || !orderData.order_number || !orderData.customer_name || !orderData.customer_email || !orderData.created_at || typeof orderData.total_amount === 'undefined') {
      console.error(`[${new Date().toISOString()}] Invalid or incomplete orderData received (missing order_number?):`, orderData);
      return new Response(JSON.stringify({ error: "Invalid order data" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // Basic validation for essential fields - adjust as per your actual orderData structure
    const requiredFields = ['order_id', 'customer_name', 'customer_email', 'created_at', 'total_amount', 'items', 'delivery_option'];
    for (const field of requiredFields) {
      if (orderData[field] === undefined) {
        console.error(`[${new Date().toISOString()}] Missing required field in orderData: ${field}`);
        return new Response(JSON.stringify({ error: `Missing required field in orderData: ${field}` }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    let emailHtml = await getEmailTemplate(supabaseClient, ADMIN_NEW_ORDER_TEMPLATE_NAME);
    console.log(`[${new Date().toISOString()}] Using template: ${emailHtml === DEFAULT_ADMIN_NEW_ORDER_HTML_TEMPLATE ? 'Default' : 'Fetched from DB'}`);

    const orderDate = new Date(orderData.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const orderTotal = `$${parseFloat(orderData.total_amount).toFixed(2)}`;
    const itemsTable = generateOrderItemsTableHtml(orderData.items);

    emailHtml = emailHtml
      .replace(/{{ORDER_NUMBER}}/g, orderData.order_number) // Use the new order_number
      .replace(/{{customer_name}}/g, orderData.customer_name)
      .replace(/{{customer_email}}/g, orderData.customer_email)
      .replace(/{{customer_phone}}/g, orderData.customer_phone || 'N/A')
      .replace(/{{order_date}}/g, orderDate)
      .replace(/{{order_total}}/g, orderTotal)
      .replace(/{{delivery_option}}/g, orderData.delivery_option || 'N/A')
      .replace(/{{order_notes}}/g, orderData.notes || 'N/A')
      .replace(/{{order_items_table}}/g, itemsTable);

    const subject = `🎉 New Order Received! (#${orderData.order_number}) - Sugar Mama Cookie Co`;

    const resendPayload = {
      from: DEFAULT_SENDER_EMAIL,
      to: ADMIN_EMAIL_TO,
      subject: subject,
      html: emailHtml,
    };

    console.log(`[${new Date().toISOString()}] Sending new order alert to ${ADMIN_EMAIL_TO}. Subject: ${subject}`);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify(resendPayload),
    });

    const responseBody = await res.json();
    if (!res.ok) {
      console.error(`[${new Date().toISOString()}] Resend API error (status ${res.status}):`, responseBody);
      return new Response(JSON.stringify({ error: 'Failed to send email via Resend.', details: responseBody }), { status: res.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    console.log(`[${new Date().toISOString()}] Admin new order alert email sent successfully. Resend ID: ${responseBody.id}`);
    return new Response(JSON.stringify({ message: "Admin new order alert email sent successfully", resendResponse: responseBody }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unhandled error in send-admin-new-order-alert:`, error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        console.error(`[${new Date().toISOString()}] Error parsing request body as JSON.`);
        return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
