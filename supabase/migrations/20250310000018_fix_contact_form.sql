-- Drop existing table if it exists
drop table if exists public.contact_submissions;

-- Create the contact_submissions table with proper structure
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
create policy "Enable insert access for all users" on public.contact_submissions
    for insert
    to public
    with check (
        recipient_email = 'faith.colwellbeaver@gmail.com' -- Only allow submissions to this email
        and length(name) > 0  -- Ensure name is not empty
        and length(email) > 0  -- Ensure email is not empty
        and length(message) > 0  -- Ensure message is not empty
    );

-- Create policy to allow service role to manage submissions
create policy "Enable full access for service role" on public.contact_submissions
    for all
    to service_role
    using (true)
    with check (true);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.contact_submissions to anon, authenticated; 