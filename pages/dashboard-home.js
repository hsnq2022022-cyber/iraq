/**
 * ========================================
 * Dashboard Layout + Home Page
 * ========================================
 */

window.DashboardLayout = {
  navItems: function() {
    return [
      { key: 'home', hash: '#dashboard/home', label: 'الرئيسية', icon: 'home' },
      { key: 'agents', hash: '#dashboard/agents', label: 'الوكلاء', icon: 'bot' },
      { key: 'kb', hash: '#dashboard/kb', label: 'قاعدة المعرفة', icon: 'database' },
      { key: 'widgets', hash: '#dashboard/widgets', label: 'الويدجت', icon: 'code' },
      { key: 'builder', hash: '#dashboard/builder', label: 'منشئ الويدجت', icon: 'edit' },
      { key: 'conversations', hash: '#dashboard/conversations', label: 'المحادثات', icon: 'chat' },
      { key: 'contacts', hash: '#dashboard/contacts', label: 'العملاء', icon: 'users' },
      { key: 'analytics', hash: '#dashboard/analytics', label: 'التحليلات', icon: 'chart' },
      { key: 'settings', hash: '#dashboard/settings', label: 'الإعدادات', icon: 'settings' },
      { key: 'billing', hash: '#dashboard/billing', label: 'الاشتراك', icon: 'globe' }
    ];
  },

  applyDirection: function() {
    const lang = window.AppConfig.getCurrentLanguage();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  },

  render: function(activeKey, title, contentHtml) {
    this.applyDirection();

    const workspace = window.AppData.workspace || {};
    const user = window.AppData.user || {};
    const currentTheme = window.AppConfig.getCurrentTheme();

    const navHtml = this.navItems().map(item => `
      <a href="${item.hash}" class="nav-link ${activeKey === item.key ? 'active' : ''}">
        ${window.AppIcons.get(item.icon, { size: 18 })}
        <span>${window.AppHelpers.esc(item.label)}</span>
      </a>
    `).join('');

    document.getElementById('app').innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-brand">
            <svg width="38" height="38" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="#0ABAB5"/>
              <path d="M16 20L24 12L32 20M24 12V36" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h2>إدارة سوشيال</h2>
              <div class="small muted">${window.AppHelpers.esc(workspace.name || '')}</div>
            </div>
          </div>

          <nav class="sidebar-nav">
            ${navHtml}
          </nav>
        </aside>

        <div class="main-area">
          <header class="topbar">
            <div style="display:flex; align-items:center; gap:12px;">
              <button class="icon-btn menu-btn" id="menuBtn">${window.AppIcons.get('menu', { size: 18 })}</button>
              <h1 class="topbar-title">${window.AppHelpers.esc(title)}</h1>
            </div>

            <div class="topbar-actions">
              <button class="icon-btn" id="themeToggle" title="تبديل الوضع">
                ${window.AppIcons.get(currentTheme === 'dark' ? 'sun' : 'moon', { size: 18 })}
              </button>

              <button class="icon-btn" id="langToggle" title="تغيير اللغة">
                ${window.AppConfig.getCurrentLanguage() === 'ar' ? 'EN' : 'ع'}
              </button>

              <span class="small muted">${window.AppHelpers.esc(user.email || '')}</span>

              <button class="btn btn-secondary btn-sm" id="logoutBtn">
                ${window.AppIcons.get('logout', { size: 16 })}
                <span>خروج</span>
              </button>
            </div>
          </header>

          <main class="content">
            <div id="page-content">${contentHtml}</div>
          </main>
        </div>
      </div>
    `;

    this.bind();
  },

  bind: function() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const current = window.AppConfig.getCurrentTheme();
      window.AppConfig.setCurrentTheme(current === 'dark' ? 'light' : 'dark');
      window.Router.navigate();
    });

    document.getElementById('langToggle')?.addEventListener('click', () => {
      const current = window.AppConfig.getCurrentLanguage();
      const next = current === 'ar' ? 'en' : 'ar';
      window.AppConfig.setCurrentLanguage(next);
      window.Router.navigate();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      const ok = await window.Modals.confirm(
        'تسجيل الخروج',
        'هل تريد تسجيل الخروج من الحساب؟',
        'خروج',
        false
      );

      if (!ok) return;

      await window.AppAuth.signOut();
      window.AppData.user = null;
      window.AppData.workspace = null;
      window.AppHelpers.toast('تم تسجيل الخروج', 'success');
      window.location.hash = '#auth';
    });
  }
};

window.Pages = window.Pages || {};

window.Pages.dashboardHome = {
  render: async function() {
    window.DashboardLayout.render('home', 'الرئيسية', `
      <div id="home-stats" class="stat-grid"></div>
      <div style="height:18px"></div>
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">أحدث المحادثات</h3>
          <a href="#dashboard/conversations" class="btn btn-secondary btn-sm">عرض الكل</a>
        </div>
        <div id="recent-conversations">جاري التحميل...</div>
      </div>
    `);

    await this.load();
  },

  load: async function() {
    const client = window.AppAuth.getClient();
    const workspace = window.AppData.workspace;

    try {
      const countOptions = { count: 'exact', head: true };

      const [
        agentsCount,
        docsCount,
        widgetsCount,
        conversationsCount,
        contactsCount,
        messagesCount,
        recentConversations
      ] = await Promise.all([
        client.from('agents').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('knowledge_docs').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('widgets').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('conversations').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('contacts').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('messages').select('*', countOptions).eq('workspace_id', workspace.id),
        client
          .from('conversations')
          .select('id, title, status, message_count, last_message_at, agents(name)')
          .eq('workspace_id', workspace.id)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(5)
      ]);

      if (agentsCount.error) throw new Error(agentsCount.error.message);
      if (docsCount.error) throw new Error(docsCount.error.message);
      if (widgetsCount.error) throw new Error(widgetsCount.error.message);
      if (conversationsCount.error) throw new Error(conversationsCount.error.message);
      if (contactsCount.error) throw new Error(contactsCount.error.message);
      if (messagesCount.error) throw new Error(messagesCount.error.message);
      if (recentConversations.error) throw new Error(recentConversations.error.message);

      this.renderStats({
        agents: agentsCount.count || 0,
        docs: docsCount.count || 0,
        widgets: widgetsCount.count || 0,
        conversations: conversationsCount.count || 0,
        contacts: contactsCount.count || 0,
        messages: messagesCount.count || 0
      });

      this.renderRecentConversations(recentConversations.data || []);
    } catch (error) {
      console.error(error);
      window.AppHelpers.toast('فشل تحميل بيانات الرئيسية: ' + error.message, 'error');
    }
  },

  renderStats: function(stats) {
    const cards = [
      { label: 'الوكلاء', value: stats.agents, href: '#dashboard/agents' },
      { label: 'قاعدة المعرفة', value: stats.docs, href: '#dashboard/kb' },
      { label: 'الويدجت', value: stats.widgets, href: '#dashboard/widgets' },
      { label: 'المحادثات', value: stats.conversations, href: '#dashboard/conversations' },
      { label: 'العملاء', value: stats.contacts, href: '#dashboard/contacts' },
      { label: 'الرسائل', value: stats.messages, href: '#dashboard/analytics' }
    ];

    document.getElementById('home-stats').innerHTML = cards.map(card => `
      <a href="${card.href}" class="stat-card" style="text-decoration:none;">
        <div class="stat-label">${window.AppHelpers.esc(card.label)}</div>
        <div class="stat-value">${card.value}</div>
      </a>
    `).join('');
  },

  renderRecentConversations: function(conversations) {
    const container = document.getElementById('recent-conversations');

    if (!conversations.length) {
      container.innerHTML = `
        <div class="empty-state">
          لا توجد محادثات بعد.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الوكيل</th>
              <th>الحالة</th>
              <th>عدد الرسائل</th>
              <th>آخر رسالة</th>
            </tr>
          </thead>
          <tbody>
            ${conversations.map(conversation => `
              <tr>
                <td>${window.AppHelpers.esc(conversation.title || 'بدون عنوان')}</td>
                <td>${window.AppHelpers.esc(conversation.agents?.name || '—')}</td>
                <td>${this.statusBadge(conversation.status)}</td>
                <td>${conversation.message_count || 0}</td>
                <td>${conversation.last_message_at ? window.AppHelpers.fmtDate(conversation.last_message_at) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  statusBadge: function(status) {
    if (status === 'active') return '<span class="badge badge-green">نشطة</span>';
    if (status === 'closed') return '<span class="badge badge-gray">مغلقة</span>';
    if (status === 'archived') return '<span class="badge badge-blue">مؤرشفة</span>';
    return '<span class="badge badge-gray">غير معروف</span>';
  }
};
