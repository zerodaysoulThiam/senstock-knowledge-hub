
-- Fix RLS policies: drop RESTRICTIVE and recreate as PERMISSIVE

-- Documents table
DROP POLICY IF EXISTS "Allow all delete on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all insert on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all select on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all update on documents" ON public.documents;

CREATE POLICY "Authenticated select documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update documents" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete documents" ON public.documents FOR DELETE TO authenticated USING (true);
-- Also allow anon for edge functions using service role
CREATE POLICY "Service select documents" ON public.documents FOR SELECT TO anon USING (true);
CREATE POLICY "Service insert documents" ON public.documents FOR INSERT TO anon WITH CHECK (true);

-- Profiles table
DROP POLICY IF EXISTS "Allow all insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all update on profiles" ON public.profiles;

CREATE POLICY "Authenticated select profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service select profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Service insert profiles" ON public.profiles FOR INSERT TO anon WITH CHECK (true);

-- Storage policies
DROP POLICY IF EXISTS "Allow public upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from documents" ON storage.objects;

CREATE POLICY "Auth upload documents storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Auth read documents storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Auth delete documents storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Anon read documents storage" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'documents');
CREATE POLICY "Anon upload documents storage" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert chunks" ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service select chunks" ON public.document_chunks FOR SELECT TO anon USING (true);
CREATE POLICY "Service insert chunks" ON public.document_chunks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Cascade delete chunks" ON public.document_chunks FOR DELETE TO authenticated USING (true);
