-- ========================================
-- Phase 6 Updates
-- صلاحيات الويدجت للزوار المجهولين (anon)
-- ========================================

-- 1) منح صلاحية الإدراج لدور anon على الجداول التي يحتاجها الويدجت
GRANT INSERT ON public.contacts TO anon;
GRANT INSERT ON public.conversations TO anon;
GRANT INSERT ON public.messages TO anon;

-- 2) سياسة تسمح للويدجت بإنشاء جهة اتصال للزائر
-- (سياسات إدراج conversations و messages للـ anon موجودة منذ المرحلة 2)
DROP POLICY IF EXISTS "widget_anon_insert_contacts" ON public.contacts;
CREATE POLICY "widget_anon_insert_contacts"
  ON public.contacts
  FOR INSERT
  TO anon
  WITH CHECK (true);
