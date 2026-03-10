ALTER TABLE public.session_answers
ADD COLUMN photo_url text null;

-- Ensure the session_photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('session_photos', 'session_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to photos
CREATE POLICY "Public Read on Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'session_photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Auth Upload to Photos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'session_photos' 
  AND auth.role() = 'authenticated'
);
