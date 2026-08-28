/**
 * ========================================
 * إدارة سوشيال - Embeddable Widget
 * ========================================
 * سكربت مستقل يُضمَّن في مواقع العملاء.
 * - يتحقق من التوكن عبر Edge Function: verify-widget
 * - يجري محادثة حقيقية عبر Edge Function: ai-respond
 * - ينشئ جهة اتصال + محادثة حقيقية في Supabase
 * - الرسائل تُحفظ فعليًا بواسطة ai-respond في جدول messages
 * - لا يعتمد على أي مكتبات خارجية
 */

(function () {
  'use strict';

  // ========================================
  // الإعدادات العامة (مفاتيح Supabase العامة فقط)
  // ========================================
  var SUPABASE_URL = 'https://mlbofdtmxjxjnjdwivqo.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYm9mZHRteGp4am5qZHdpdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTI0MTcsImV4cCI6MjEwMjU2ODQxN30.EJ49q1zSEvlRnus0tHIKK4bdpVp_XRgORB5Iif2v-XY';

  var LOG_PREFIX = '[إدارة سوشيال ويدجت]';

  // ========================================
  // قراءة التوكن ومسار الملفات من وسم السكربت
  // ========================================
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var TOKEN = currentScript ? (currentScript.getAttribute('data-widget-token') || '') : '';
  var BASE_URL = (currentScript && currentScript.src && currentScript.src.indexOf('/widget.js') !== -1)
    ? currentScript.src.split('/widget.js')[0]
    : '';

  if (!TOKEN) {
    console.error(LOG_PREFIX, 'لا يمكن التشغيل: سمة data-widget-token غير موجودة في وسم السكربت.');
    return;
  }

  // ========================================
  // الحالة
  // ========================================
  var config = null;          // بيانات الويدجت من verify-widget
  var contactId = null;       // جهة اتصال الزائر
  var conversationId = null;  // المحادثة الحالية
  var messagesCache = [];     // نسخة محلية من رسائل المحادثة الحالية
  var isOpen = false;
  var isSending = false;
  var visitorId = null;

  // مفاتيح التخزين المحلي (معزولة لكل ويدجت عبر تجزئة التوكن)
  var ns = hashToken(TOKEN);
  var KEY_VISITOR = 'qsw_visitor_' + ns;
  var KEY_CONTACT = 'qsw_contact_' + ns;
  var KEY_CONVERSATION = 'qsw_conversation_' + ns;
  var KEY_MESSAGES = 'qsw_messages_' + ns;

  // عناصر الواجهة
  var root, panel, launcher, body, suggestions, input, sendBtn;

  // ========================================
  // أدوات مساعدة
  // ========================================

  function hashToken(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* التخزين غير متاح */ }
  }

  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* تجاهل */ }
  }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  function truncate(str, len) {
    str = String(str || '');
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  function functionHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    };
  }

  function restHeaders() {
    var h = functionHeaders();
    h['Prefer'] = 'return=representation';
    return h;
  }

  async function readApiError(res) {
    try {
      var data = await res.json();
      return data.error || data.message || data.msg || ('HTTP ' + res.status);
    } catch (e) {
      return 'HTTP ' + res.status;
    }
  }

  // ========================================
  // تحميل الأنماط تلقائيًا
  // ========================================

  function injectStyles() {
    if (!BASE_URL) {
      console.warn(LOG_PREFIX, 'تعذر تحديد مسار widget.css — تأكد أن اسم الملف widget.js');
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = BASE_URL + '/widget.css';
    link.onerror = function () {
      console.warn(LOG_PREFIX, 'فشل تحميل ملف الأنماط widget.css من: ' + link.href);
    };
    document.head.appendChild(link);
  }

  // ========================================
  // التحقق من التوكن
  // ========================================

  async function verifyWidget() {
    var res = await fetch(SUPABASE_URL + '/functions/v1/verify-widget', {
      method: 'POST',
      headers: functionHeaders(),
      body: JSON.stringify({
        token: TOKEN,
        origin: window.location.origin
      })
    });

    var data = null;
    try { data = await res.json(); } catch (e) { /* استجابة غير JSON */ }

    if (!res.ok || !data || data.valid !== true) {
      var msg = (data && data.error) ? data.error : ('HTTP ' + res.status);
      throw new Error('فشل التحقق من الويدجت: ' + msg);
    }

    return data.widget;
  }

  // ========================================
  // إنشاء جهة اتصال الزائر (حقيقي)
  // ========================================

  async function ensureContact() {
    var cached = storageGet(KEY_CONTACT);
    if (cached) return cached;

    var payload = {
      workspace_id: config.workspace_id,
      name: 'زائر الموقع',
      source: 'widget',
      metadata: {
        visitor_id: visitorId,
        origin: window.location.origin,
        page: window.location.href,
        user_agent: navigator.userAgent
      }
    };

    var res = await fetch(SUPABASE_URL + '/rest/v1/contacts', {
      method: 'POST',
      headers: restHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('فشل إنشاء جهة الاتصال: ' + await readApiError(res));
    }

    var rows = await res.json();
    var contact = Array.isArray(rows) ? rows[0] : rows;
    storageSet(KEY_CONTACT, contact.id);
    return contact.id;
  }

  // ========================================
  // إنشاء محادثة جديدة (حقيقي)
  // ========================================

  async function createConversation(firstMessage) {
    var payload = {
      workspace_id: config.workspace_id,
      agent_id: config.agent.id,
      widget_id: config.id,
      contact_id: contactId,
      title: truncate(firstMessage, 60) || 'محادثة جديدة',
      status: 'active',
      metadata: { visitor_id: visitorId }
    };

    var res = await fetch(SUPABASE_URL + '/rest/v1/conversations', {
      method: 'POST',
      headers: restHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('فشل إنشاء المحادثة: ' + await readApiError(res));
    }

    var rows = await res.json();
    var conversation = Array.isArray(rows) ? rows[0] : rows;
    return conversation.id;
  }

  // ========================================
  // حفظ/استعادة الحالة المحلية
  // ========================================

  function saveState() {
    if (conversationId) storageSet(KEY_CONVERSATION, conversationId);
    storageSet(KEY_MESSAGES, JSON.stringify(messagesCache));
  }

  function restoreState() {
    visitorId = storageGet(KEY_VISITOR);
    if (!visitorId) {
      visitorId = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      storageSet(KEY_VISITOR, visitorId);
    }

    contactId = storageGet(KEY_CONTACT) || null;
    conversationId = storageGet(KEY_CONVERSATION) || null;

    messagesCache = [];
    var raw = storageGet(KEY_MESSAGES);
    if (raw) {
      try { messagesCache = JSON.parse(raw) || []; } catch (e) { messagesCache = []; }
    }
  }

  function resetConversation() {
    conversationId = null;
    messagesCache = [];
    storageRemove(KEY_CONVERSATION);
    storageRemove(KEY_MESSAGES);
  }

  // ========================================
  // بناء الواجهة
  // ========================================

  function mount() {
    root = document.createElement('div');
    root.className = 'qsw-root' + ((config.theme && config.theme.position === 'bottom-left') ? ' qsw-pos-left' : '');
    if (config.theme && config.theme.primaryColor) {
      root.style.setProperty('--qsw-primary', config.theme.primaryColor);
    }

    var agentName = esc((config.agent && config.agent.name) || config.name || 'المساعد الذكي');

    root.innerHTML =
      '<button class="qsw-launcher" type="button" aria-label="فتح المحادثة">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>' +
      '</button>' +
      '<div class="qsw-panel" role="dialog" aria-label="نافذة المحادثة">' +
        '<div class="qsw-header">' +
          '<div class="qsw-header-info">' +
            '<span class="qsw-header-title">' + agentName + '</span>' +
            '<span class="qsw-header-status">متصل الآن</span>' +
          '</div>' +
          '<div class="qsw-header-actions">' +
            '<button class="qsw-header-btn" type="button" data-action="new" title="محادثة جديدة">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>' +
            '</button>' +
            '<button class="qsw-header-btn" type="button" data-action="close" title="إغلاق">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="qsw-body"></div>' +
        '<div class="qsw-suggestions"></div>' +
        '<div class="qsw-input-row">' +
          '<input class="qsw-input" type="text" placeholder="اكتب رسالتك هنا…" autocomplete="off">' +
          '<button class="qsw-send" type="button" aria-label="إرسال">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="qsw-footer">يعمل بواسطة إدارة سوشيال</div>' +
      '</div>';

    document.body.appendChild(root);

    launcher = root.querySelector('.qsw-launcher');
    panel = root.querySelector('.qsw-panel');
    body = root.querySelector('.qsw-body');
    suggestions = root.querySelector('.qsw-suggestions');
    input = root.querySelector('.qsw-input');
    sendBtn = root.querySelector('.qsw-send');

    launcher.addEventListener('click', function () {
      isOpen ? closePanel() : openPanel();
    });

    root.querySelector('[data-action="close"]').addEventListener('click', closePanel);
    root.querySelector('[data-action="new"]').addEventListener('click', function () {
      resetConversation();
      body.innerHTML = '';
      renderWelcome();
      renderSuggestions();
    });

    sendBtn.addEventListener('click', function () {
      sendMessage(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('qsw-open');
    if (body.children.length === 0) {
      renderCachedOrWelcome();
    }
    setTimeout(function () { input.focus(); }, 80);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('qsw-open');
  }

  // ========================================
  // عرض الرسائل
  // ========================================

  function renderCachedOrWelcome() {
    if (messagesCache.length) {
      messagesCache.forEach(function (m) {
        appendMessage(m.role, m.content, null, false);
      });
      scrollDown();
    } else {
      renderWelcome();
      renderSuggestions();
    }
  }

  function renderWelcome() {
    var welcome = (config.agent && config.agent.welcome_message) || 'مرحبًا! كيف يمكنني مساعدتك اليوم؟';
    appendMessage('assistant', welcome, null, false);
  }

  function renderSuggestions() {
    var questions = (config.agent && config.agent.suggested_questions) || [];
    if (!questions.length || messagesCache.length) {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
      return;
    }

    suggestions.style.display = 'flex';
    suggestions.innerHTML = '';

    questions.slice(0, 4).forEach(function (q) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qsw-suggestion';
      btn.textContent = q;
      btn.addEventListener('click', function () {
        sendMessage(q);
      });
      suggestions.appendChild(btn);
    });
  }

  function hideSuggestions() {
    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
  }

  function appendMessage(role, content, sources, cache) {
    var div = document.createElement('div');

    if (role === 'user') {
      div.className = 'qsw-msg qsw-msg-user';
      div.textContent = content;
    } else if (role === 'error') {
      div.className = 'qsw-msg qsw-msg-error';
      div.textContent = content;
    } else {
      div.className = 'qsw-msg qsw-msg-bot';
      div.textContent = content;

      if (sources && sources.length) {
        var src = document.createElement('span');
        src.className = 'qsw-msg-sources';
        src.textContent = 'المصادر: ' + sources.map(function (s) { return s.doc_name; }).join('، ');
        div.appendChild(src);
      }
    }

    body.appendChild(div);
    scrollDown();

    if (cache !== false && role !== 'error') {
      messagesCache.push({ role: role, content: content });
    }
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'qsw-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(div);
    scrollDown();
    return div;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }

  // ========================================
  // إرسال الرسالة (المسار الحقيقي الكامل)
  // ========================================

  async function sendMessage(text) {
    text = String(text || '').trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;
    input.value = '';

    hideSuggestions();
    appendMessage('user', text);
    saveState();

    var typing = showTyping();

    try {
      // 1) إنشاء جهة الاتصال والمحادثة عند أول رسالة
      if (!conversationId) {
        contactId = await ensureContact();
        conversationId = await createConversation(text);
        saveState();
      }

      // 2) استدعاء محرك الذكاء الاصطناعي الحقيقي
      // ملاحظة: ai-respond يحفظ رسالة المستخدم ورد المساعد فعليًا في جدول messages
      var res = await fetch(SUPABASE_URL + '/functions/v1/ai-respond', {
        method: 'POST',
        headers: functionHeaders(),
        body: JSON.stringify({
          agentId: config.agent.id,
          conversationId: conversationId,
          message: text
        })
      });

      var data = null;
      try { data = await res.json(); } catch (e) { /* استجابة غير JSON */ }

      removeTyping(typing);

      if (!res.ok || !data || data.error) {
        var errMsg = (data && data.error) ? data.error : ('HTTP ' + res.status);
        throw new Error(errMsg);
      }

      appendMessage('assistant', data.response || 'لم يتم استلام رد.', data.sources || []);
      saveState();

    } catch (err) {
      removeTyping(typing);
      console.error(LOG_PREFIX, err);
      appendMessage('error', 'تعذر إرسال الرسالة: ' + (err.message || 'خطأ غير معروف'), null, false);
    }

    isSending = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // ========================================
  // الإقلاع
  // ========================================

  async function init() {
    injectStyles();

    try {
      config = await verifyWidget();

      if (!config.agent || !config.agent.id) {
        throw new Error('الويدجت غير مرتبط بوكيل صالح.');
      }

      restoreState();
      mount();
      console.info(LOG_PREFIX, 'تم تحميل الويدجت بنجاح:', config.name);
    } catch (err) {
      // فشل حقيقي: لا نصنع واجهة وهمية، نعرض الخطأ الفعلي في الطرفية
      console.error(LOG_PREFIX, err.message || err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
