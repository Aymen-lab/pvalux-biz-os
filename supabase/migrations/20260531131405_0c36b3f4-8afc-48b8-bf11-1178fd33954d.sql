
create type public.followup_status as enum ('new','waiting','promise','partial','escalated','closed');
create type public.followup_priority as enum ('high','medium','low');

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_id uuid not null,
  invoice_id uuid,
  quote_id uuid,
  status public.followup_status not null default 'new',
  priority public.followup_priority not null default 'medium',
  channel text not null default 'whatsapp',
  language text,
  tone text,
  message text,
  note text,
  promised_date date,
  next_action_date date,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.follow_ups to authenticated;
grant all on public.follow_ups to service_role;

alter table public.follow_ups enable row level security;

create policy "company read follow_ups" on public.follow_ups for select to authenticated
  using (company_id = public.current_company_id());
create policy "company write follow_ups" on public.follow_ups for insert to authenticated
  with check (company_id = public.current_company_id());
create policy "company update follow_ups" on public.follow_ups for update to authenticated
  using (company_id = public.current_company_id());
create policy "company delete follow_ups" on public.follow_ups for delete to authenticated
  using (company_id = public.current_company_id());

create trigger trg_follow_ups_updated before update on public.follow_ups
  for each row execute function public.set_updated_at();

create index idx_follow_ups_company on public.follow_ups(company_id, next_action_date);
create index idx_follow_ups_customer on public.follow_ups(customer_id, created_at desc);
