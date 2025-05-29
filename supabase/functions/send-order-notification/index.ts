import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // Supabase types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Supabase client

// --- Environment Variables ---
// IMPORTANT: Set these in your Supabase project's Edge Function settings:
// 1. RESEND_API_KEY: Your Resend API key.
// 2. SUPABASE_URL: Your Supabase project URL.
// 3. SUPABASE_ANON_KEY: Your Supabase project anon key.
// 4. RESEND_FROM_EMAIL (Optional): Verified sender email, e.g., "Sugar Mama <hello@yourdomain.com>"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

const DEFAULT_SENDER_EMAIL = RESEND_FROM_EMAIL || "Sugar Mama Cookie Co <notifications@yourverifieddomain.com>"; // Fallback if RESEND_FROM_EMAIL is not set

// --- Helper Functions ---
const formatCurrency = (amount: number, currency = 'AUD', locale = 'en-AU') => {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

const formatDate = (dateString: string, locale = 'en-AU') => {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const generateOrderItemsTable = (items: Array<{ product_name: string; quantity: number; unit_price: number; total_price: number }>) => {
  if (!items || items.length === 0) return '<p>No items in this order.</p>';
  let tableHtml = '<table class="items-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">';
  tableHtml += '<thead><tr><th style="border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f8f8f8;">Item</th><th style="border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f8f8f8;">Quantity</th><th style="border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f8f8f8;">Price</th><th style="border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f8f8f8;">Total</th></tr></thead>';
  tableHtml += '<tbody>';
  items.forEach(item => {
    tableHtml += `<tr>
        <td style="border: 1px solid #ddd; padding: 10px;">${item.product_name}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.unit_price)}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.total_price)}</td>
      </tr>`;
  });
  tableHtml += '</tbody></table>';
  return tableHtml;
};

const DEFAULT_HTML_TEMPLATE = `
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
      .container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 600px; margin: 20px auto; }
      h1 { color: #5a3e36; font-size: 24px; margin-top: 0; }
      p { line-height: 1.6; margin-bottom: 15px; }
      .order-details { margin-top: 20px; margin-bottom: 20px; }
      .order-details strong { display: inline-block; width: 120px; }
      .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; }
      .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      .items-table th { background-color: #f8f8f8; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Thank you for your order, {{customer_name}}!</h1>
      <p>We're excited to prepare your delicious treats. Your order has been confirmed.</p>
      <div class="order-details">
        <p><strong>Order Number:</strong> #{{ORDER_NUMBER}}</p>
        <p><strong>Order Date:</strong> {{order_date}}</p>
        <p><strong>Order Total:</strong> {{order_total}}</p>
      </div>
      <h2 style="font-size: 20px; color: #5a3e36; margin-top: 30px;">Order Summary:</h2>
      {{order_items_table}}
      <p>We'll notify you again once your order is out for delivery or ready for pickup.</p>
      <div class="footer">
        <p>Thanks for choosing Sugar Mama Cookie Co!</p>
        <p>Sugar Mama Cookie Co | Melbourne, Australia</p>
      </div>
    </div>
  </body>
</html>
`.trim();

console.log('Edge Function send-order-notification started.');

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);
  // Log all headers for detailed debugging
  // const headersObject = {};
  // req.headers.forEach((value, key) => { headersObject[key] = value; });
  // console.log(`[${new Date().toISOString()}] Request Headers:`, JSON.stringify(headersObject, null, 2));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*", // For development. Be more specific in production.
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  // --- Environment Variable Checks ---
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing one or more required environment variables: RESEND_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY");
    return new Response(
      JSON.stringify({ error: "Service configuration error. Required environment variables are missing." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  if (!RESEND_API_KEY) { // This specific check is now redundant due to the combined check above, but kept for logical flow if separated later.
    console.error("RESEND_API_KEY is not set in environment variables.");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    let rawBodyForLogging = "<Could not read body as text>";
    try {
      // Attempt to clone and read for logging, as req.json() consumes the body
      const clonedReq = req.clone();
      rawBodyForLogging = await clonedReq.text(); 
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] Error reading raw request body for logging:`, e.message);
    }
    console.log(`[${new Date().toISOString()}] Attempting to parse JSON from body. Raw body (approx): ${rawBodyForLogging.substring(0, 500)}`);

    const requestPayload = await req.json();
    console.log(`[${new Date().toISOString()}] Successfully parsed request payload:`, JSON.stringify(requestPayload, null, 2));

    const { orderData } = requestPayload;
    
    if (requestPayload === null || typeof requestPayload !== 'object') {
      console.error(`[${new Date().toISOString()}] Parsed payload is not an object or is null.`);
      return new Response(
        JSON.stringify({ error: "Invalid request payload: expected a JSON object." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!('orderData' in requestPayload)) {
      console.error(`[${new Date().toISOString()}] 'orderData' key missing in request payload. Received keys:`, Object.keys(requestPayload));
      return new Response(
        JSON.stringify({ error: "Invalid request structure: 'orderData' key missing in payload." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    console.log(`[${new Date().toISOString()}] Extracted orderData:`, JSON.stringify(orderData, null, 2));

    if (!orderData || typeof orderData !== 'object' || orderData === null) {
      console.error(`[${new Date().toISOString()}] 'orderData' is null, not an object, or undefined after destructuring. Value:`, orderData);
      return new Response(
        JSON.stringify({ error: "Invalid 'orderData' content: expected an object." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!orderData.customer_email || !orderData.order_id || !orderData.order_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields in orderData: customer_email, order_id, order_number" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const recipientEmail = orderData.customer_email;
    const emailSubject = `Your Sugar Mama Cookie Co Order Confirmation (#${orderData.order_number})`;

    // Fetch email template from Supabase
    let htmlContent = DEFAULT_HTML_TEMPLATE;
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('html_content')
        .eq('name', 'order_confirmation')
        .single();

      if (templateError && templateError.code !== 'PGRST116') { // PGRST116: Not found
        console.warn('Error fetching email template:', templateError.message);
        // Fallback to default template is already handled by htmlContent initial value
      } else if (templateData && templateData.html_content) {
        htmlContent = templateData.html_content;
        console.log("Using custom email template from Supabase.");
      } else {
        console.log("No custom 'order_confirmation' template found, using default.");
      }
    } catch (dbError) {
      console.warn('Unexpected error fetching email template:', dbError.message);
      // Fallback to default template
    }

    // Replace placeholders
    htmlContent = htmlContent.replace(/{{customer_name}}/g, orderData.customer_name || 'Valued Customer');
    htmlContent = htmlContent.replace(/{{ORDER_NUMBER}}/g, String(orderData.order_number));
    htmlContent = htmlContent.replace(/{{order_date}}/g, formatDate(orderData.created_at));
    htmlContent = htmlContent.replace(/{{order_total}}/g, formatCurrency(orderData.total_amount));
    htmlContent = htmlContent.replace(/{{order_items_table}}/g, generateOrderItemsTable(orderData.items));

    const senderEmail = DEFAULT_SENDER_EMAIL;

    console.log(`Attempting to send email to: ${recipientEmail} with subject: "${emailSubject}" from: ${senderEmail}`);

    const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: senderEmail,
            to: [recipientEmail], // Resend API expects 'to' to be an array
            subject: emailSubject,
            html: htmlContent,
        })
    });

    const responseData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API Error:", responseData);
      return new Response(
        JSON.stringify({ error: "Failed to send email via Resend", details: responseData }),
        { status: resendResponse.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    console.log("Email sent successfully via Resend:", responseData);
    return new Response(
      JSON.stringify({ message: "Email sent successfully", data: responseData }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (e) {
    console.error("Error processing request in Edge Function:", e);
    let errorMessage = "Internal Server Error";
    if (e instanceof Error) {
        errorMessage = e.message;
    } else if (typeof e === 'string') {
        errorMessage = e;
    }
    return new Response(
      JSON.stringify({ error: "Failed to process request", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
