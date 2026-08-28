/**
 * ========================================
 * Router Module
 * ========================================
 * توجيه الصفحات عبر location.hash
 */

window.AppData = window.AppData || {
  user: null,
  workspace: null
};

window.Router = {
  routes: {
    '': 'auth',
    '#': 'auth',
    '#auth': 'auth',
    '#login': 'auth',
    '#signup': 'auth',
    '#reset-password': 'auth',

    '#dashboard': 'dashboardHome',
    '#dashboard/home': 'dashboardHome',
    '#dashboard/agents': 'dashboardAgents',
    '#dashboard/kb': 'dashboardKb',
    '#dashboard/widgets': 'dashboardWidgets',
    '#dashboard/builder': 'dashboardBuilder',
    '#dashboard/conversations': 'dashboardConversations',
    '#dashboard/contacts': 'dashboardContacts',
    '#dashboard/analytics': 'dashboardAnalytics',
    '#dashboard/settings': 'dashboardSettings',
    '#dashboard/billing': 'dashboardBilling'
  },

  init: function() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  getHash: function() {
    return (window.location.hash || '').trim();
  },

  isProtected: function(hash) {
    return hash.startsWith('#dashboard');
  },

  showLoading: function(message = 'جاري التحميل...') {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>${window.AppHelpers.esc(message)}</p>
      </div>
    `;
  },

  navigate: async function() {
    const hash = this.getHash();

    try {
      const session = await window.AppAuth.getSession();

      // الصفحات المحمية
      if (this.isProtected(hash)) {
        if (!session) {
          window.location.hash = '#auth';
          return;
        }

        if (!window.AppData.user) {
          window.AppData.user = await window.AppAuth.getCurrentUser();
        }

        if (!window.AppData.user) {
          window.location.hash = '#auth';
          return;
        }

        await this.ensureWorkspace();
      }

      // إذا مسجل دخول وفتح صفحة المصادقة
      if ((hash === '' || hash.startsWith('#auth')) && session) {
        window.location.hash = '#dashboard/home';
        return;
      }

      const pageName = this.routes[hash] || (this.isProtected(hash) ? 'dashboardHome' : 'auth');

      if (!window.Pages || !window.Pages[pageName]) {
        document.getElementById('app').innerHTML = `
          <div class="empty-state">
            <h2>الصفحة غير موجودة</h2>
            <p>لا يمكن العثور على الصفحة المطلوبة.</p>
            <a href="#dashboard/home" class="btn btn-primary">العودة إلى لوحة التحكم</a>
          </div>
        `;
        return;
      }

      await window.Pages[pageName].render();
    } catch (error) {
      console.error('Router error:', error);
      window.AppHelpers.toast(error.message || 'حدث خطأ أثناء التنقل', 'error');
      document.getElementById('app').innerHTML = `
        <div class="empty-state">
          <h2>حدث خطأ</h2>
          <p>${window.AppHelpers.esc(error.message || 'خطأ غير متوقع')}</p>
          <button class="btn btn-primary" onclick="window.Router.navigate()">إعادة المحاولة</button>
        </div>
      `;
    }
  },

  ensureWorkspace: async function() {
    if (window.AppData.workspace) {
      return window.AppData.workspace;
    }

    const client = window.AppAuth.getClient();
    const user = window.AppData.user;

    if (!client || !user) {
      throw new Error('جلسة المستخدم غير متوفرة');
    }

    // جلب مساحة العمل التي يملكها المستخدم
    const { data: workspace, error } = await client
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error('فشل جلب مساحة العمل: ' + error.message);
    }

    if (workspace) {
      window.AppData.workspace = workspace;
      return workspace;
    }

    // إذا لم توجد مساحة عمل، ننشئ واحدة حقيقية
    const baseName = (user.email || 'workspace').split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') || 'workspace';

    const slug = `${baseName}-${Date.now().toString(36)}`;
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || baseName;

    const { data: newWorkspace, error: insertError } = await client
      .from('workspaces')
      .insert({
        owner_id: user.id,
        name: `${displayName} - مساحة العمل`,
        slug: slug,
        settings: {},
        plan: 'free',
        subscription_status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('فشل إنشاء مساحة العمل: ' + insertError.message);
    }

    window.AppData.workspace = newWorkspace;
    return newWorkspace;
  }
};
