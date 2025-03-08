import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get unprocessed submissions
    const { data: submissions, error: fetchError } = await supabaseClient
      .from('contact_submissions')
      .select('*')
      .eq('processed', false)
      .limit(10)

    if (fetchError) throw fetchError

    if (!submissions || submissions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new submissions to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Process each submission
    for (const submission of submissions) {
      try {
        // Send email using your preferred email service
        // For this example, we'll use Resend (you'll need to set up an account and add your API key)
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
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${submission.name}</p>
              <p><strong>Email:</strong> ${submission.email}</p>
              <p><strong>Message:</strong></p>
              <p>${submission.message}</p>
            `,
          }),
        })

        if (!emailResponse.ok) {
          throw new Error(`Failed to send email: ${emailResponse.statusText}`)
        }

        // Mark submission as processed
        const { error: updateError } = await supabaseClient
          .from('contact_submissions')
          .update({ processed: true })
          .eq('id', submission.id)

        if (updateError) throw updateError
      } catch (err) {
        // Log error and update submission
        console.error(`Error processing submission ${submission.id}:`, err)
        await supabaseClient
          .from('contact_submissions')
          .update({
            error: err.message,
            processed: true
          })
          .eq('id', submission.id)
      }
    }

    return new Response(
      JSON.stringify({ message: 'Successfully processed submissions' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 