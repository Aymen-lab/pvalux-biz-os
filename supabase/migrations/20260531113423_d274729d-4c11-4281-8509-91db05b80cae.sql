
-- 1. Add owner_id column
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);

-- 2. Replace INSERT policy: owner_id must equal auth.uid()
DROP POLICY IF EXISTS "Authenticated create company" ON public.companies;
CREATE POLICY "Authenticated create own company"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 3. Replace SELECT policy: owner, role-holder, or current_company
DROP POLICY IF EXISTS "Members read company" ON public.companies;
CREATE POLICY "Read accessible companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR id = public.current_company_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.company_id = companies.id AND ur.user_id = auth.uid()
    )
  );

-- 4. Update policy: owner or role 'owner'
DROP POLICY IF EXISTS "Owners update company" ON public.companies;
CREATE POLICY "Owners update company"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), id, 'owner'::public.app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), id, 'owner'::public.app_role));
