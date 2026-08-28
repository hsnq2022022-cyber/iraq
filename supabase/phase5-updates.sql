-- ========================================
-- Phase 5 Updates
-- تحديث محرك الذكاء إلى Gemini
-- ========================================

-- 1) تحديث عمود embedding إلى 768 إذا لم تنفذه سابقًا
-- إذا كان لديك بيانات embedding قديمة 1536 فسيحتاج إعادة توليد
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.knowledge_chunks
      ALTER COLUMN embedding TYPE vector(768);
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'embedding column update skipped: %', SQLERRM;
  END;
END $$;

-- 2) تحديث قيد النموذج في جدول agents
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_model_check;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Drop agents_model_check skipped: %', SQLERRM;
  END;
END $$;

ALTER TABLE public.agents
  ALTER COLUMN model SET DEFAULT 'gemini-3.1-flash-lite';

ALTER TABLE public.agents
  ADD CONSTRAINT agents_model_check
  CHECK (model IN ('gemini-3.1-flash-lite'));

-- 3) تحديث حالة الاشتراك الافتراضية إن لم تكن موجودة
ALTER TABLE public.workspaces
  ALTER COLUMN subscription_status SET DEFAULT 'active';
