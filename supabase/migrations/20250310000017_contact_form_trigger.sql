-- Create function to call edge function
create or replace function handle_new_contact_submission()
returns trigger
language plpgsql
security definer
as $$
declare
  result json;
begin
  select net.http_post(
    url := current_setting('app.edge_function_url') || '/handle-contact-form',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', current_setting('app.edge_function_auth')
    )
  ) into result;
  
  return new;
end;
$$;

-- Create trigger
create trigger on_contact_submission_created
  after insert on contact_submissions
  for each row
  execute function handle_new_contact_submission(); 