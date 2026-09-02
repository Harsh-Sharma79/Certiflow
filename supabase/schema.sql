// ============================================
// CertiFlow - Supabase Database Schema
// ============================================
// Run this SQL in your Supabase SQL Editor
// to set up all required tables and RLS policies.
// ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  template_url TEXT,
  template_width INTEGER DEFAULT 1200,
  template_height INTEGER DEFAULT 800,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'configured', 'generating', 'completed', 'error')),
  zip_url TEXT,
  certificate_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. RECIPIENTS TABLE
-- ============================================
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. CERTIFICATE FIELDS TABLE
-- ============================================
CREATE TABLE certificate_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  x_position NUMERIC(5,2) NOT NULL DEFAULT 50,
  y_position NUMERIC(5,2) NOT NULL DEFAULT 50,
  font_size INTEGER DEFAULT 24,
  font_family TEXT DEFAULT 'Arial',
  font_color TEXT DEFAULT '#000000',
  font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold')),
  text_align TEXT DEFAULT 'center' CHECK (text_align IN ('left', 'center', 'right')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 5. GENERATED CERTIFICATES TABLE
-- ============================================
CREATE TABLE generated_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_recipients_project_id ON recipients(project_id);
CREATE INDEX idx_certificate_fields_project_id ON certificate_fields(project_id);
CREATE INDEX idx_generated_certificates_project_id ON generated_certificates(project_id);
CREATE INDEX idx_generated_certificates_recipient_id ON generated_certificates(recipient_id);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_certificates ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Projects: Users can CRUD their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Recipients: Users can manage recipients for their own projects
CREATE POLICY "Users can view own recipients"
  ON recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = recipients.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipients"
  ON recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = recipients.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipients"
  ON recipients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = recipients.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Certificate Fields: Users can manage fields for their own projects
CREATE POLICY "Users can view own certificate fields"
  ON certificate_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = certificate_fields.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create certificate fields"
  ON certificate_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = certificate_fields.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own certificate fields"
  ON certificate_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = certificate_fields.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own certificate fields"
  ON certificate_fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = certificate_fields.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Generated Certificates: Users can manage certificates for their own projects
CREATE POLICY "Users can view own generated certificates"
  ON generated_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_certificates.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated certificates"
  ON generated_certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_certificates.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own generated certificates"
  ON generated_certificates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_certificates.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- 8. STORAGE BUCKETS
-- ============================================

-- Create storage buckets via Supabase Dashboard or SQL:
-- Run these in the Supabase SQL Editor

-- Templates bucket (for certificate background images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Generated certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated', 'generated', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Templates: Users can upload/view their own templates
CREATE POLICY "Anyone can view templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'templates'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'templates'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Generated: Anyone can view, authenticated users can upload
CREATE POLICY "Anyone can view generated files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated');

CREATE POLICY "Authenticated users can upload generated files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own generated files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
