-- Create the changelog_entries table
CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  version TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone
CREATE POLICY "Allow read access to all users" 
  ON public.changelog_entries
  FOR SELECT USING (true);

-- Create policy to allow insert from authenticated users only
CREATE POLICY "Allow insert for authenticated users" 
  ON public.changelog_entries
  FOR INSERT TO authenticated USING (true);

-- Create policy to allow update for authenticated users only
CREATE POLICY "Allow update for authenticated users" 
  ON public.changelog_entries
  FOR UPDATE TO authenticated USING (true);

-- Add the table to the public API
COMMENT ON TABLE public.changelog_entries IS 'Table containing changelog entries for the application'; 