import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get unprocessed submissions
    const { data: submissions, error: fetchError } = await supabaseClient
      .from('contact_submissions')
      .select('*')
      .eq('processed', false)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!submissions || submissions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new submissions to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each submission
    for (const submission of submissions) {
      try {
        // Send email using Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Sugar Mama Cookie Co <no-reply@sugarmamacookieco.com>',
            to: submission.recipient_email,
            subject: `New Contact Form Submission from ${submission.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4A5568; margin-bottom: 20px;">New Contact Form Submission</h2>
                
                <div style="background-color: #F7FAFC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${submission.name}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${submission.email}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
                  <p style="margin: 0; white-space: pre-wrap;">${submission.message}</p>
                </div>
                
                <div style="font-size: 14px; color: #718096;">
                  <p>This message was sent from the Sugar Mama Cookie Co website contact form.</p>
                </div>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          throw new Error(`Failed to send email: ${emailResponse.statusText}`);
        }

        // Mark submission as processed
        const { error: updateError } = await supabaseClient
          .from('contact_submissions')
          .update({ processed: true })
          .eq('id', submission.id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error(`Error processing submission ${submission.id}:`, err);
        
        // Update submission with error
        await supabaseClient
          .from('contact_submissions')
          .update({
            error: err.message,
            processed: true
          })
          .eq('id', submission.id);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Successfully processed submissions' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 