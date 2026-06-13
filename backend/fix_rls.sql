-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('datasage-uploads', 'datasage-uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

-- Create policies to allow public access to datasage-uploads bucket
CREATE POLICY "Allow public uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'datasage-uploads');

CREATE POLICY "Allow public read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'datasage-uploads');

CREATE POLICY "Allow public update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'datasage-uploads');

CREATE POLICY "Allow public delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'datasage-uploads');
