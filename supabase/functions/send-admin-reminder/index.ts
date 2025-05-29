import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const ADMIN_EMAIL_TO = "hello@sugarmamacookieco.com.au";
const DEFAULT_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "delivery@sugarmamacookieco.com.au"; // Fallback if RESEND_FROM_EMAIL is not set
const ADMIN_REMINDER_TEMPLATE_NAME = 'admin_order_reminder';

console.log('Edge Function send-admin-reminder started.');

// Default admin reminder template (fallback if not found in DB)
const DEFAULT_ADMIN_REMINDER_HTML_TEMPLATE = `
<html>
  <head><title>Order Reminder</title></head>
  <body>
    <h1>Admin Reminder: Unacknowledged Order</h1>
    <p>Order #{{order_id}} from {{customer_name}} ({{customer_email}}) placed on {{order_date}} for {{order_total}} requires attention.</p>
    <p>Please review and update its status.</p>
    <p>Items:</p>
    {{order_items_table}}
    <p>This is a default reminder template. Please customize it in the admin panel.</p>
  </body>
</html>
`.trim();

function generateOrderItemsTable(items: any[] = []): string {
  if (!items || items.length === 0) {
    return '<p>No items information available.</p>';
  }
  let table = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
  table += '<thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total Price</th></tr></thead>';
  table += '<tbody>';
  items.forEach(item => {
    const unitPrice = parseFloat(item.unit_price || 0);
    const quantity = parseInt(item.quantity || 0, 10);
    const totalPrice = unitPrice * quantity;
    table += `<tr>
                <td>${item.product_name || 'N/A'}</td>
                <td>${quantity}</td>
                <td>${typeof item.unit_price !== 'undefined' ? `$${unitPrice.toFixed(2)}` : 'N/A'}</td>
                <td>$${totalPrice.toFixed(2)}</td>
              </tr>`;
  });
  table += '</tbody></table>';
  return table;
}

async function getEmailTemplate(supabaseClient: any, templateName: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Fetching template: ${templateName}`);
  const { data: templateData, error: templateError } = await supabaseClient
    .from('email_templates')
    .select('html_content')
    .eq('name', templateName)
    .single();

  if (templateError && templateError.code !== 'PGRST116') {
    console.error(`[${new Date().toISOString()}] Error fetching template ${templateName}:`, templateError);
    // Fallback to default if there's an unexpected error
    return DEFAULT_ADMIN_REMINDER_HTML_TEMPLATE;
  }
  if (!templateData || !templateData.html_content) {
    console.log(`[${new Date().toISOString()}] Template ${templateName} not found in DB or content is empty, using default.`);
    return DEFAULT_ADMIN_REMINDER_HTML_TEMPLATE;
  }
  console.log(`[${new Date().toISOString()}] Template ${templateName} fetched successfully.`);
  return templateData.html_content;
}

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[${new Date().toISOString()}] Missing one or more required environment variables (RESEND_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY).");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  try {
    const requestPayload = await req.json();
    console.log(`[${new Date().toISOString()}] Successfully parsed request payload:`, JSON.stringify(requestPayload, null, 2));

    const { orderData } = requestPayload;

    if (!orderData || typeof orderData !== 'object' || orderData === null) {
      console.error(`[${new Date().toISOString()}] 'orderData' is null, not an object, or undefined. Value:`, orderData);
      return new Response(JSON.stringify({ error: "Invalid 'orderData' content: expected an object." }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (!orderData.order_id || !orderData.customer_name || !orderData.customer_email) {
      console.error(`[${new Date().toISOString()}] Missing required fields in orderData for admin reminder: order_id, customer_name, customer_email. Received:`, orderData);
      return new Response(JSON.stringify({ error: "Missing required fields in orderData for admin reminder." }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    let htmlContent = await getEmailTemplate(supabaseClient, ADMIN_REMINDER_TEMPLATE_NAME);
    const orderItemsTableHtml = generateOrderItemsTable(orderData.items);

    // Replace placeholders
    htmlContent = htmlContent.replace(/\{\{customer_name\}\}/g, orderData.customer_name || 'N/A');
    htmlContent = htmlContent.replace(/\{\{customer_email\}\}/g, orderData.customer_email || 'N/A');
    htmlContent = htmlContent.replace(/\{\{order_id\}\}/g, orderData.order_id ? String(orderData.order_id).substring(0, 8) : 'N/A'); // Short ID
    htmlContent = htmlContent.replace(/\{\{order_date\}\}/g, orderData.created_at ? new Date(orderData.created_at).toLocaleDateString() : 'N/A');
    htmlContent = htmlContent.replace(/\{\{order_total\}\}/g, typeof orderData.total_amount !== 'undefined' ? `$${parseFloat(orderData.total_amount).toFixed(2)}` : 'N/A');
    htmlContent = htmlContent.replace(/\{\{order_items_table\}\}/g, orderItemsTableHtml);

    const subject = `Order Reminder: Order #${String(orderData.order_id).substring(0,8)} Requires Attention`;

    const resendPayload = {
      from: DEFAULT_FROM_EMAIL,
      to: ADMIN_EMAIL_TO,
      subject: subject,
      html: htmlContent,
    };

    console.log(`[${new Date().toISOString()}] Sending admin reminder email to ${ADMIN_EMAIL_TO} via Resend. Subject: ${subject}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const responseBody = await res.json();

    if (!res.ok) {
      console.error(`[${new Date().toISOString()}] Resend API error (status ${res.status}):`, responseBody);
      return new Response(JSON.stringify({ error: 'Failed to send email via Resend.', details: responseBody }), {
        status: res.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    console.log(`[${new Date().toISOString()}] Admin reminder email sent successfully. Resend response:`, responseBody);
    return new Response(JSON.stringify({ message: "Admin reminder email sent successfully", resendResponse: responseBody }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unhandled error in send-admin-reminder function:`, error);
    let errorMessage = "Internal server error.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check if the error is from JSON parsing
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        console.error(`[${new Date().toISOString()}] Error parsing request body as JSON.`);
        return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
            status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
