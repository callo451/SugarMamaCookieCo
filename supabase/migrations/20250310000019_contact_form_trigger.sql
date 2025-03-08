-- Create function to call edge function
create or replace function handle_contact_form_submission()
returns trigger
language plpgsql
security definer
as $$
declare
  result json;
begin
  -- Call the Edge Function
  select content::json into result
  from http((
    'POST',
    current_setting('app.edge_function_url') || '/send-contact-email',
    ARRAY[http_header('Authorization', current_setting('app.edge_function_auth'))],
    'application/json',
    '{}'
  )::http_request);
  
  return new;
end;
$$;

-- Create trigger
create trigger on_contact_submission_created
  after insert on contact_submissions
  for each row
  execute function handle_contact_form_submission(); 