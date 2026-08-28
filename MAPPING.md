# 🗺️ خريطة المشروع — إدارة سوشيال

> منصة SaaS لإدارة السوشيال ميديا بالذكاء الاصطناعي.
> المحرك الفعلي: **Gemini 3.1 Flash Lite** (وليس Qwen المذكور في المخطط الأصلي).
> قاعدة البيانات: **Supabase** (Postgres + Auth + Storage + Edge Functions + pgvector).

---

## 1. نظرة معمارية سريعة

```
المتصفح (Vanilla JS + Tailwind)
   │
   ├── واجهة لوحة التحكم (صفحات #dashboard/*)
   │      └── js/auth.js → Supabase Auth
   │      └── js/ai-engine.js → Edge Function: ai-respond
   │      └── js/kb-ingest.js → Edge Function: kb-ingest / kb-crawl
   │
   ├── ويدجت العملاء (widget/widget.js)
   │      └── Edge Function: verify-widget → ai-respond
   │
   └── Supabase
          ├── Postgres (الجداول + RLS + pgvector)
          ├── Auth (المستخدمون + الجلسات)
          └── Edge Functions (Gemini API + Embeddings)
```

---

## 2. ربط الجداول بالملفات والميزات

| الجدول | الغرض | الملفات المسؤولة | الميزة |
|---|---|---|---|
| `workspaces` | مساحات العمل (عزل البيانات) | `pages/dashboard-settings.js`, `pages/dashboard-billing.js`, `js/router.js` | إعدادات + اشتراك |
| `workspace_members` | أعضاء المساحة | `supabase/schema.sql` (RLS فقط) | صلاحيات الوصول |
| `agents` | الوكلاء الذكيون | `pages/dashboard-agents.js`, `pages/dashboard-builder.js` | CRUD وكلاء |
| `widgets` | ويدجت التضمين | `pages/dashboard-widgets.js`, `widget/widget.js` | CRUD + تضمين |
| `knowledge_docs` | مستندات قاعدة المعرفة | `pages/dashboard-kb.js`, `js/kb-ingest.js` | رفع مستندات |
| `knowledge_chunks` | القطع + الـ Embeddings (vector 768) | `functions/kb-ingest`, `functions/ai-respond` | RAG |
| `contacts` | العملاء / جهات الاتصال | `pages/dashboard-contacts.js`, `widget/widget.js` | CRM |
| `conversations` | المحادثات | `pages/dashboard-conversations.js`, `widget/widget.js` | متابعة المحادثات |
| `messages` | رسائل المحادثات | `functions/ai-respond`, `pages/dashboard-conversations.js` | سجل الرسائل |

---

## 3. ربط الميزات بالملفات (حسب المرحلة)
