
-- Drop existing restrictive policies on documents
DROP POLICY IF EXISTS "Anyone authenticated can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone authenticated can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON public.documents;

-- Create permissive policies on documents
CREATE POLICY "Allow all select on documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow all insert on documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on documents" ON public.documents FOR DELETE USING (true);

-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;

-- Create permissive policies on profiles
CREATE POLICY "Allow all select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on profiles" ON public.profiles FOR UPDATE USING (true);

-- Storage policies for documents bucket
CREATE POLICY "Allow public upload to documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow public read from documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Allow public delete from documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
