
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO anon, authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read stock" ON public.stock_items FOR SELECT USING (true);
CREATE POLICY "public insert stock" ON public.stock_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update stock" ON public.stock_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete stock" ON public.stock_items FOR DELETE USING (true);

CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "public insert sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete sales" ON public.sales FOR DELETE USING (true);
