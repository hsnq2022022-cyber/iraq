/* ============================================================
   عون AI — widget.js (ملف مستقل يُستضاف على CDN)
   طريقة التضمين في موقع العميل:
   أضف وسم سكربت يشير عبر src إلى هذا الملف مع السمات التالية:
     data-widget-id="WIDGET_ID"
     data-token="TOKEN"
     data-api="https://YOUR-PROJECT.supabase.co/functions/v1"
   ثم أغلق الوسم بشكل صحيح.
   - يقرأ الإعدادات الأحدث من الخادم عند كل تحميل صفحة (بدون كاش).
   - يتحقق من التوكن قبل قبول أي رسالة.
   - معزول بالكامل عبر Shadow DOM.
============================================================ */
(function () {
  var sc = document.currentScript || (function () {
    var all = document.querySelectorAll('script[data-widget-id]');
    return all[all.length - 1];
  })();
  if (!sc) return;
  var WIDGET_ID = sc.getAttribute('data-widget-id');
  var TOKEN = sc.getAttribute('data-token');
  var API = (sc.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (!WIDGET_ID || !TOKEN || !API) return;
  if (window.__AOWN_LOADED__) return; window.__AOWN_LOADED__ = true;

  var CSS = [
    ':host{all:initial}',
    '.aw-root{position:fixed;bottom:16px;z-index:2147483000;direction:rtl;font-family:"IBM Plex Sans Arabic",Cairo,Tahoma,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:12px}',
    '.aw-launch{width:56px;height:56px;border-radius:9999px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:transform .2s}',
    '.aw-launch:hover{transform:scale(1.06)}',
    '.aw-badge{position:absolute;top:-4px;left:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:9999px;font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center}',
    '.aw-panel{display:flex;flex-direction:column;overflow:hidden;background:#1a1e24;border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 40px rgba(0,0,0,.45);max-width:calc(100vw - 24px);max-height:72vh;animation:awin .25s ease}',
    '@keyframes awin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.aw-head{display:flex;align-items:center;gap:10px;padding:12px 14px}',
    '.aw-ava{position:relative;flex:none}',
    '.aw-ava img{width:40px;height:40px;border-radius:9999px;object-fit:cover;border:2px solid rgba(255,255,255,.3)}',
    '.aw-dot{position:absolute;bottom:-2px;left:-2px;width:11px;height:11px;border-radius:9999px;background:#34d399;border:2px solid #fff}',
    '.aw-name{font-weight:700;color:#fff;font-size:14px}',
    '.aw-status{font-size:11px;color:rgba(255,255,255,.8)}',
    '.aw-logo{width:28px;height:28px;border-radius:8px;object-fit:cover;background:rgba(255,255,255,.1)}',
    '.aw-close{margin-inline-start:auto;background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;font-size:18px;line-height:1;padding:4px}',
    '.aw-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:8px;background:#12151a;min-height:160px}',
    '.aw-row{display:flex}',
    '.aw-row.v{justify-content:flex-start}',
    '.aw-row.a{justify-content:flex-end}',
    '.aw-b{max-width:85%;font-size:14px;line-height:1.7;padding:9px 13px;border-radius:14px;color:#e8eaed;background:#22272f;border-start-start-radius:4px;white-space:pre-wrap;word-break:break-word}',
    '.aw-row.a .aw-b{color:#fff;border-start-end-radius:4px}',
    '.aw-sys{font-size:11px;color:#fcd34d;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:8px;padding:6px 10px;text-align:center}',
    '.aw-typing{display:flex;gap:4px;padding:6px 10px;color:#6b7684}',
    '.aw-typing i{width:6px;height:6px;border-radius:9999px;background:currentColor;animation:awtp 1s infinite}',
    '.aw-typing i:nth-child(2){animation-delay:.18s}.aw-typing i:nth-child(3){animation-delay:.36s}',
    '@keyframes awtp{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}',
    '.aw-foot{padding:10px;background:#12151a;border-top:1px solid #2b323b}',
    '.aw-credit{font-size:10px;color:#6b7684;text-align:center;padding-bottom:6px}',
    '.aw-credit b{color:#0ABAB5}',
    '.aw-form{display:flex;align-items:center;gap:8px;background:#22272f;padding:6px 8px}',
    '.aw-input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#f5f6f7;font-size:14px;padding:6px 8px;font-family:inherit}',
    '.aw-input::placeholder{color:#6b7684}',
    '.aw-send{border:none;color:#fff;padding:8px;border-radius:10px;cursor:pointer;display:flex;flex:none}',
    '.hidden{display:none!important}',
    '@media (max-width:640px){.aw-full .aw-panel{position:fixed;inset:0;width:100vw!important;height:100vh!important;max-height:100vh;border-radius:0!important}}'
  ].join('\n');

  function h(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mdSimple(s) {
    var t = esc(s);
    t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    t = t.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4fdcd7;text-decoration:underline">$1</a>');
    return t;
  }
  function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(); var o = c.createOscillator(); var g = c.createGain(); o.frequency.value = 880; g.gain.value = .04; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .12); } catch (e) {} }

  var host = document.createElement('div');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  var style = h('style'); style.textContent = CSS; root.appendChild(style);
  var wrap = h('div', 'aw-root'); root.appendChild(wrap);

  fetch(API + '/verify-widget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': TOKEN },
    body: JSON.stringify({ widget_id: WIDGET_ID, token: TOKEN })
  })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg || !cfg.ok || !cfg.settings) return;
      var s = cfg.settings;

      wrap.classList.add(s.mobile === 'full' ? 'aw-full' : 'aw-panel-mode');
      wrap.style[s.position === 'bottom-right' ? 'right' : 'left'] = '16px';

      // Panel
      var panel = h('div', 'aw-panel hidden');
      panel.style.width = Math.min(s.width || 360, 420) + 'px';
      panel.style.height = Math.min(s.height || 520, 640) + 'px';
      panel.style.borderRadius = (s.radius || 16) + 'px';

      var head = h('div', 'aw-head');
      head.style.background = 'linear-gradient(135deg,' + s.primary + ',' + s.secondary + ')';
      var ava = h('div', 'aw-ava', '<img src="' + esc(s.avatar || cfg.agent.avatar || '') + '" alt="">' + (s.online ? '<span class="aw-dot"></span>' : ''));
      var info = h('div', null, '<div class="aw-name">' + esc(s.name) + '</div><div class="aw-status">' + (s.online ? 'متصل الآن' : 'غير متصل') + '</div>');
      head.appendChild(ava); head.appendChild(info);
      if (s.logo) { var lg = h('img', 'aw-logo'); lg.src = s.logo; head.appendChild(lg); }
      var closeB = h('button', 'aw-close', '&#10005;'); closeB.type = 'button'; head.appendChild(closeB);
      panel.appendChild(head);

      var msgs = h('div', 'aw-msgs'); panel.appendChild(msgs);

      var foot = h('div', 'aw-foot');
      if (s.credit) foot.appendChild(h('div', 'aw-credit', 'مدعوم بواسطة <b>عون AI</b>'));
      var form = h('form', 'aw-form');
      form.style.borderRadius = Math.max((s.radius || 16) - 6, 8) + 'px';
      var input = h('input', 'aw-input'); input.placeholder = s.placeholder || 'اكتب رسالتك...'; input.maxLength = 500;
      var send = h('button', 'aw-send'); send.type = 'submit';
      send.style.background = s.primary;
      send.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 14-7-4 7 4 7z"/></svg>';
      form.appendChild(input); form.appendChild(send);
      foot.appendChild(form);
      panel.appendChild(foot);

      // Launcher
      var launch = h('button', 'aw-launch');
      launch.type = 'button';
      launch.style.background = s.primary;
      launch.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.5A8 8 0 1 1 21 12z"/></svg>';
      if (s.badge) {
        var badge = h('span', 'aw-badge', '1');
        badge.style.background = s.secondary;
        launch.appendChild(badge);
      }

      wrap.appendChild(panel); wrap.appendChild(launch);

      var convoId = null;
      try { convoId = localStorage.getItem('aown_conv_' + WIDGET_ID) || null; } catch (e) {}
      var open = false, rl = [];

      function push(from, text) {
        var row = h('div', 'aw-row ' + (from === 'visitor' ? 'v' : 'a'));
        row.appendChild(h('div', from === 'system' ? 'aw-sys' : 'aw-b', from === 'system' ? esc(text) : mdSimple(text)));
        msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
      }
      function typing(on) {
        var t = msgs.querySelector('.aw-typing');
        if (on && !t) { var d = h('div', 'aw-typing', '<i></i><i></i><i></i>'); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; }
        if (!on && t) t.remove();
      }
      function openPanel() {
        open = true; panel.classList.remove('hidden'); launch.classList.add('hidden');
        if (!msgs.children.length) push('ai', s.welcome);
        setTimeout(function () { input.focus(); }, 60);
      }
      launch.addEventListener('click', openPanel);
      closeB.addEventListener('click', function () { open = false; panel.classList.add('hidden'); launch.classList.remove('hidden'); });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        if (text.length > 500) { push('system', 'الرسالة طويلة جدًا، اختصرها قليلًا.'); return; }
        rl.push(Date.now()); rl = rl.filter(function (x) { return Date.now() - x < 20000; });
        if (rl.length > 5) { push('system', 'تمهل قليلًا 🙂 أرسلت رسائل كثيرة في وقت قصير.'); return; }
        input.value = ''; push('visitor', text);
        typing(s.typing !== false);

        fetch(API + '/ai-respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': TOKEN },
          body: JSON.stringify({ widget_id: WIDGET_ID, token: TOKEN, message: text, conversation_id: convoId })
        })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            typing(false);
            if (j && j.conversation_id) {
              convoId = j.conversation_id;
              try { localStorage.setItem('aown_conv_' + WIDGET_ID, convoId); } catch (e) {}
            }
            if (j && j.error === 'limit') { push('system', j.message || 'تم تجاوز الحد الشهري. الرجاء الترقية.'); return; }
            if (j && j.reply) {
              push('ai', j.reply);
              if (s.sound) beep();
              if (j.handoff) push('system', 'تم تحويل المحادثة إلى فريق الدعم ✋');
              return;
            }
            push('ai', (j && j.message) ? j.message : 'عذرًا، حصل خطأ مؤقت. حاول مرة ثانية.');
          })
          .catch(function () { typing(false); push('ai', 'عذرًا، حصل خطأ مؤقت. حاول مرة ثانية.'); });
      });

      if (s.autoOpen) setTimeout(function () { if (!open) openPanel(); }, Math.max(1, s.delay || 3) * 1000);
    })
    .catch(function () { /* فشل التحقق: لا تعرض شيئًا */ });
})();
