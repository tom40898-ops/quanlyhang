
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'shop';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'shop';

CREATE TABLE IF NOT EXISTS public.service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_items TO anon, authenticated;
GRANT ALL ON public.service_items TO service_role;

ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all service" ON public.service_items FOR ALL USING (true) WITH CHECK (true);
