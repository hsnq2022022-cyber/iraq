-- ========================================
-- إدارة سوشيال - Database Schema
-- PostgreSQL + pgvector + RLS
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- ========================================
-- 1. WORKSPACES (مساحات العمل)
-- ========================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- ========================================
-- 2. WORKSPACE MEMBERS (أعضاء مساحة العمل)
-- ========================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);

-- ========================================
-- 3. AGENTS (الوكلاء الذكيون)
-- ========================================
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  model TEXT DEFAULT 'qwen-plus' CHECK (model IN ('qwen-turbo', 'qwen-plus', 'qwen-max')),
  temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 2000,
  welcome_message TEXT,
  suggested_questions TEXT[],
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_workspace ON public.agents(workspace_id);
CREATE INDEX idx_agents_active ON public.agents(workspace_id, is_active);

-- ========================================
-- 4. WIDGETS (القطع القابلة للتضمين)
-- ========================================
CREATE TABLE IF NOT EXISTS public.widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  allowed_origins TEXT[] DEFAULT '{}'::text[],
  theme JSONB DEFAULT '{"primaryColor":"#0ABAB5","position":"bottom-right"}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_workspace ON public.widgets(workspace_id);
CREATE INDEX idx_widgets_agent ON public.widgets(agent_id);
CREATE INDEX idx_widgets_token ON public.widgets(token);

-- ========================================
-- 5. KNOWLEDGE DOCS (مستندات قاعدة المعرفة)
-- ========================================
CREATE TABLE IF NOT EXISTS public.knowledge_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'text', 'crawl')),
  source_url TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_docs_workspace ON public.knowledge_docs(workspace_id);
CREATE INDEX idx_knowledge_docs_agent ON public.knowledge_docs(agent_id);
CREATE INDEX idx_knowledge_docs_status ON public.knowledge_docs(status);

-- ========================================
-- 6. KNOWLEDGE CHUNKS (قطع المستندات + Embeddings)
-- ========================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID NOT NULL REFERENCES public.knowledge_docs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_chunks_doc ON public.knowledge_chunks(doc_id);
CREATE INDEX idx_knowledge_chunks_workspace ON public.knowledge_chunks(workspace_id);

-- Index for vector similarity search (IVFFlat or HNSW)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
  ON public.knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- ========================================
-- 7. CONTACTS (جهات الاتصال / العملاء)
-- ========================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT CHECK (source IN ('widget', 'manual', 'import', 'api')),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- ========================================
-- 8. CONVERSATIONS (المحادثات)
-- ========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.widgets(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'محادثة جديدة',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_conversations_agent ON public.conversations(agent_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(workspace_id, status);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- ========================================
-- 9. MESSAGES (رسائل المحادثات)
-- ========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,
  token_count INTEGER,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_workspace ON public.messages(workspace_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- ========================================
-- 10. AUTO-UPDATE TRIGGER (تحديث updated_at تلقائيًا)
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'workspaces', 'agents', 'widgets', 
      'knowledge_docs', 'contacts', 'conversations'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ========================================
-- 11. VECTOR SEARCH FUNCTION (البحث المتجهي)
-- ========================================
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_workspace_id UUID,
  match_agent_id UUID DEFAULT NULL,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  doc_id UUID,
  doc_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.content,
    kc.doc_id,
    kd.name AS doc_name,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_docs kd ON kd.id = kc.doc_id
  WHERE kc.workspace_id = match_workspace_id
    AND kd.status = 'ready'
    AND (match_agent_id IS NULL OR kd.agent_id = match_agent_id OR kd.agent_id IS NULL)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- 12. AUTO-CREATE WORKSPACE ON USER SIGNUP
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name TEXT;
  user_slug TEXT;
BEGIN
  -- Get user's display name
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Generate unique slug
  user_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'));
  
  -- Ensure slug is unique
  WHILE EXISTS(SELECT 1 FROM public.workspaces WHERE slug = user_slug) LOOP
    user_slug := user_slug || '-' || substr(md5(random()::text), 1, 5);
  END LOOP;
  
  -- Insert workspace
  INSERT INTO public.workspaces (owner_id, name, slug)
  VALUES (NEW.id, user_name || '''s Workspace', user_slug);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 13. UPDATE CONVERSATION MESSAGE COUNT
-- ========================================
CREATE OR REPLACE FUNCTION public.update_conversation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    message_count = message_count + 1,
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_stats();

-- ========================================
-- 14. ROW LEVEL SECURITY (RLS) - الأمان على مستوى الصف
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has access to workspace
CREATE OR REPLACE FUNCTION public.has_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = p_workspace_id 
      AND user_id = auth.uid() 
      AND status = 'active'
  );
$$;

-- Helper function: Check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  );
$$;

-- ========================================
-- RLS POLICIES
-- ========================================

-- WORKSPACES
CREATE POLICY "Users can view their own workspaces"
  ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid() OR id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Users can update their own workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Owners can manage workspace members"
  ON public.workspace_members FOR ALL
  USING (public.is_workspace_owner(workspace_id));

-- AGENTS
CREATE POLICY "Users can CRUD agents in their workspace"
  ON public.agents FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- WIDGETS
CREATE POLICY "Users can CRUD widgets in their workspace"
  ON public.widgets FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- Public read for widget by token (for embed)
CREATE POLICY "Public can read widget by token"
  ON public.widgets FOR SELECT
  USING (is_enabled = true);

-- KNOWLEDGE DOCS
CREATE POLICY "Users can CRUD knowledge docs in their workspace"
  ON public.knowledge_docs FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- KNOWLEDGE CHUNKS
CREATE POLICY "Users can CRUD knowledge chunks in their workspace"
  ON public.knowledge_chunks FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- CONTACTS
CREATE POLICY "Users can CRUD contacts in their workspace"
  ON public.contacts FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- CONVERSATIONS
CREATE POLICY "Users can CRUD conversations in their workspace"
  ON public.conversations FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- MESSAGES
CREATE POLICY "Users can CRUD messages in their workspace"
  ON public.messages FOR ALL
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- Public insert for widget messages (anonymous users chatting)
CREATE POLICY "Anyone can insert messages via widget"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert conversations via widget"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

-- ========================================
-- 15. GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks TO anon;
GRANT EXECUTE ON FUNCTION public.has_workspace_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_access TO anon;

/* ==== تحديث إضافي من المحادثة الأصلية - تحديث أبعاد الـ Vector لـ Gemini (768) ==== */
-- تحديث من 1536 إلى 768 لـ Gemini Embeddings
-- ابحث عن السطر التالي في ملف schema.sql:
-- embedding vector(1536)
-- وغيره إلى:
-- embedding vector(768)

-- أو نفذ هذا الأمر مباشرة:
ALTER TABLE public.knowledge_chunks 
  ALTER COLUMN embedding TYPE vector(768);

-- إعادة إنشاء الـ Index
DROP INDEX IF EXISTS idx_knowledge_chunks_embedding;
CREATE INDEX idx_knowledge_chunks_embedding 
  ON public.knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
