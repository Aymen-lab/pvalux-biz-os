
-- Enums
create type public.app_role as enum ('owner','admin','sales');
create type public.customer_status as enum ('lead','active','inactive');
create type public.risk_level as enum ('low','medium','high');
create type public.quote_status as enum ('draft','sent','follow_up','accepted','rejected');
create type public.invoice_status as enum ('unpaid','partial','paid','overdue');
create type public.product_type as enum ('fenetres','portes','baies_vitrees','volet_roulant','garde_corps','brise_soleil','mur_rideau','autre');
create type public.pricing_unit as enum ('m2','ml','piece');

-- Companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  tax_id text,
  currency text not null default 'TND',
  default_tax numeric not null default 19,
  payment_terms text default 'Paiement à 30 jours',
  created_at timestamptz not null default now()
);

-- Profiles (1-1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.app_role not null default 'owner',
  unique (user_id, company_id, role)
);

-- Security definer helpers
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(_user_id uuid, _company_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and company_id=_company_id and role=_role)
$$;

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  address text,
  notes text,
  status public.customer_status not null default 'lead',
  risk_level public.risk_level not null default 'low',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customers(company_id);

-- Quotes
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quote_number text not null,
  project_name text,
  status public.quote_status not null default 'draft',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  transport numeric not null default 0,
  installation numeric not null default 0,
  tax_rate numeric not null default 19,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  conditions text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_number)
);
create index on public.quotes(company_id);
create index on public.quotes(customer_id);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  category text,
  product_type public.product_type not null default 'autre',
  description text,
  width numeric default 0,
  height numeric default 0,
  quantity numeric not null default 1,
  unit public.pricing_unit not null default 'piece',
  unit_price numeric not null default 0,
  total numeric not null default 0,
  position int not null default 0
);
create index on public.quote_lines(quote_id);

-- Invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text not null,
  due_date date,
  status public.invoice_status not null default 'unpaid',
  total numeric not null default 0,
  paid numeric not null default 0,
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);
create index on public.invoices(company_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric not null,
  method text,
  paid_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.payments(invoice_id);

-- Update timestamps trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_quotes_updated before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recalc invoice balance/status when payments change
create or replace function public.recalc_invoice()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv_id uuid; total_paid numeric; inv record;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(amount),0) into total_paid from public.payments where invoice_id = inv_id;
  select * into inv from public.invoices where id = inv_id;
  update public.invoices
    set paid = total_paid,
        balance = inv.total - total_paid,
        status = case
          when total_paid >= inv.total then 'paid'::public.invoice_status
          when total_paid > 0 then 'partial'::public.invoice_status
          when inv.due_date is not null and inv.due_date < current_date then 'overdue'::public.invoice_status
          else 'unpaid'::public.invoice_status
        end
    where id = inv_id;
  return null;
end $$;

create trigger trg_payments_recalc
  after insert or update or delete on public.payments
  for each row execute function public.recalc_invoice();

-- GRANTS
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
grant select, insert, update, delete on public.quote_lines to authenticated;
grant all on public.quote_lines to service_role;
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;

-- RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.customers enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

-- Profiles policies
create policy "Users view own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

-- Companies: members can read; owners can update; anyone authenticated can create (becomes owner)
create policy "Members read company" on public.companies for select to authenticated using (id = public.current_company_id());
create policy "Owners update company" on public.companies for update to authenticated using (public.has_role(auth.uid(), id, 'owner'));
create policy "Authenticated create company" on public.companies for insert to authenticated with check (true);

-- user_roles
create policy "Read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or company_id = public.current_company_id());
create policy "Owner manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), company_id, 'owner')) with check (public.has_role(auth.uid(), company_id, 'owner'));
create policy "Self insert initial owner role" on public.user_roles for insert to authenticated with check (user_id = auth.uid());

-- Generic company-scoped policies
create policy "company read customers" on public.customers for select to authenticated using (company_id = public.current_company_id());
create policy "company write customers" on public.customers for insert to authenticated with check (company_id = public.current_company_id());
create policy "company update customers" on public.customers for update to authenticated using (company_id = public.current_company_id());
create policy "company delete customers" on public.customers for delete to authenticated using (company_id = public.current_company_id());

create policy "company read quotes" on public.quotes for select to authenticated using (company_id = public.current_company_id());
create policy "company write quotes" on public.quotes for insert to authenticated with check (company_id = public.current_company_id());
create policy "company update quotes" on public.quotes for update to authenticated using (company_id = public.current_company_id());
create policy "company delete quotes" on public.quotes for delete to authenticated using (company_id = public.current_company_id());

create policy "company read lines" on public.quote_lines for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and q.company_id = public.current_company_id()));
create policy "company write lines" on public.quote_lines for insert to authenticated with check (exists (select 1 from public.quotes q where q.id = quote_id and q.company_id = public.current_company_id()));
create policy "company update lines" on public.quote_lines for update to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and q.company_id = public.current_company_id()));
create policy "company delete lines" on public.quote_lines for delete to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and q.company_id = public.current_company_id()));

create policy "company read invoices" on public.invoices for select to authenticated using (company_id = public.current_company_id());
create policy "company write invoices" on public.invoices for insert to authenticated with check (company_id = public.current_company_id());
create policy "company update invoices" on public.invoices for update to authenticated using (company_id = public.current_company_id());
create policy "company delete invoices" on public.invoices for delete to authenticated using (company_id = public.current_company_id());

create policy "company read payments" on public.payments for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and i.company_id = public.current_company_id()));
create policy "company write payments" on public.payments for insert to authenticated with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.company_id = public.current_company_id()));
create policy "company update payments" on public.payments for update to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and i.company_id = public.current_company_id()));
create policy "company delete payments" on public.payments for delete to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and i.company_id = public.current_company_id()));
