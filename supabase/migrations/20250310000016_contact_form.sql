-- Create the contact_submissions table
create table public.contact_submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  message text not null,
  recipient_email text not null,
  processed boolean default false,
  error text
);

-- Enable RLS
alter table public.contact_submissions enable row level security;

-- Create policy to allow inserting submissions
create policy "Allow anonymous contact submissions"
  on public.contact_submissions
  for insert
  to public
  with check (true);

-- Create policy to allow service role to update submissions
create policy "Allow service role to manage submissions"
  on public.contact_submissions
  for all
  to service_role
  using (true)
  with check (true); 