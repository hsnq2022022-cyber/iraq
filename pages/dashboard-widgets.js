/**
 * ========================================
 * Dashboard Widgets Page
 * CRUD حقيقي للويدجت
 * ========================================
 */

window.Pages.dashboardWidgets = {
  state: {
    widgets: [],
    agents: []
  },

  render: async function() {
    window.DashboardLayout.render('widgets', 'الويدجت', `
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">قائمة الويدجت</h3>
          <button class="btn btn-primary" id="addWidgetBtn">
            ${window.AppIcons.get('plus', { size: 16 })}
            <span>إنشاء ويدجت</span>
          </button>
        </div>
        <div id="widgets-list">جاري التحميل...</div>
      </div>
    `);

    document.getElementById('addWidgetBtn').addEventListener('click', () => {
      this.openWidgetModal();
    });

    await Promise.all([
      this.loadAgents(),
      this.loadWidgets()
    ]);
  },

  loadAgents: async function() {
    const client = window.AppAuth.getClient();
    const { data, error } = await client
      .from('agents')
      .select('id, name')
      .eq('workspace_id', window.AppData.workspace.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    this.state.agents = data || [];
  },

  loadWidgets: async function() {
    const client = window.AppAuth.getClient();

    try {
      const { data, error } = await client
        .from('widgets')
        .select('*, agents(name)')
        .eq('workspace_id', window.AppData.workspace.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      this.state.widgets = data || [];
      this.renderWidgetsTable();
    } catch (error) {
      window.AppHelpers.toast('فشل تحميل الويدجت: ' + error.message, 'error');
    }
  },

  renderWidgetsTable: function() {
    const container = document.getElementById('widgets-list');

    if (!this.state.widgets.length) {
      container.innerHTML = `
        <div class="empty-state">
          لا يوجد ويدجت بعد. أنشئ ويدجت حقيقيًا لربطه بوكيل.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الوكيل</th>
              <th>الحالة</th>
              <th>التوكن</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.widgets.map(widget => `
              <tr>
                <td>${window.AppHelpers.esc(widget.name)}</td>
                <td>${window.AppHelpers.esc(widget.agents?.name || '—')}</td>
                <td>
                  ${widget.is_enabled
                    ? '<span class="badge badge-green">مفعل</span>'
                    : '<span class="badge badge-gray">موقوف</span>'}
                </td>
                <td>
                <span class="small muted">${window.AppHelpers.esc((widget.token || '').slice(0, 10))}...</span>
                </td>
                <td>
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" data-action="embed" data-id="${widget.id}">كود التضمين</button>
                    <button class="btn btn-secondary btn-sm" data-action="toggle" data-id="${widget.id}">
                      ${widget.is_enabled ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button class="icon-btn" data-action="delete" data-id="${widget.id}" title="حذف">
                      ${window.AppIcons.get('trash', { size: 16 })}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-action="embed"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const widget = this.state.widgets.find(w => w.id === btn.dataset.id);
        if (widget) this.showEmbedCode(widget);
      });
    });

    container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const widget = this.state.widgets.find(w => w.id === btn.dataset.id);
        if (!widget) return;

        try {
          const client = window.AppAuth.getClient();
          const { error } = await client
            .from('widgets')
            .update({ is_enabled: !widget.is_enabled })
            .eq('id', widget.id)
            .eq('workspace_id', window.AppData.workspace.id);

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('تم تحديث حالة الويدجت', 'success');
          await this.loadWidgets();
        } catch (error) {
          window.AppHelpers.toast('فشل تحديث الويدجت: ' + error.message, 'error');
        }
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const widget = this.state.widgets.find(w => w.id === btn.dataset.id);
        if (!widget) return;

        const ok = await window.Modals.confirm(
          'حذف الويدجت',
          `هل تريد حذف "${widget.name}"؟`,
          'حذف',
          true
        );

        if (!ok) return;

        try {
          const client = window.AppAuth.getClient();
          const { error } = await client
            .from('widgets')
            .delete()
            .eq('id', widget.id)
            .eq('workspace_id', window.AppData.workspace.id);

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('تم حذف الويدجت', 'success');
          await this.loadWidgets();
        } catch (error) {
          window.AppHelpers.toast('فشل حذف الويدجت: ' + error.message, 'error');
        }
      });
    });
  },

  openWidgetModal: function() {
    if (!this.state.agents.length) {
      window.AppHelpers.toast('يجب إنشاء وكيل واحد على الأقل أولًا', 'warning');
      return;
    }

    window.Modals.open({
      title: 'إنشاء ويدجت جديد',
      body: `
        <form id="widgetForm">
          <div class="form-group">
            <label class="form-label">اسم الويدجت *</label>
            <input type="text" name="name" class="form-input" required>
          </div>

          <div class="form-group">
            <label class="form-label">الوكيل *</label>
            <select name="agent_id" class="form-input" required>
              <option value="">اختر وكيلًا</option>
              ${this.state.agents.map(agent => `
                <option value="${agent.id}">${window.AppHelpers.esc(agent.name)}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">النطاقات المسموح بها (كل نطاق في سطر - اختياري)</label>
            <textarea name="allowed_origins" class="form-input" rows="4" placeholder="https://example.com&#10;http://localhost:3000"></textarea>
            <div class="small muted">اتركه فارغًا للسماح لأي نطاق مؤقتًا.</div>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>إلغاء</button>
        <button type="button" class="btn btn-primary" id="saveWidgetBtn">إنشاء</button>
      `
    });

    document.getElementById('saveWidgetBtn').addEventListener('click', async () => {
      const form = document.getElementById('widgetForm');

      if (!window.Forms.validate(form)) {
        window.AppHelpers.toast('يرجى تعبئة الحقول المطلوبة', 'error');
        return;
      }

      const values = window.Forms.get(form);

      const payload = {
        workspace_id: window.AppData.workspace.id,
        agent_id: values.agent_id,
        name: values.name,
        allowed_origins: values.allowed_origins
          ? values.allowed_origins.split('\n').map(o => o.trim()).filter(Boolean)
          : [],
        is_enabled: true,
        theme: {
          primaryColor: '#0ABAB5',
          position: 'bottom-right'
        },
        settings: {}
      };

      try {
        const client = window.AppAuth.getClient();
        const { data: widget, error } = await client
          .from('widgets')
          .insert(payload)
          .select()
          .single();

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم إنشاء الويدجت بنجاح', 'success');
        window.Modals.close();
        await this.loadWidgets();
        this.showEmbedCode(widget);
      } catch (error) {
        window.AppHelpers.toast('فشل إنشاء الويدجت: ' + error.message, 'error');
      }
    });
  },

  showEmbedCode: function(widget) {
    const isHttp = window.location.protocol.startsWith('http');
    const baseUrl = isHttp ? window.location.origin : 'https://YOUR-DOMAIN';
    const embedCode = `<script src="${baseUrl}/widget/widget.js" data-widget-token="${widget.token}" defer></script>`;

    window.Modals.open({
      title: 'كود تضمين الويدجت',
      body: `
        <p class="small muted">
          انسخ هذا الكود وضعه قبل وسم الإغلاق <code>&lt;/body&gt;</code> في موقع العميل.
          سيتم تفعيل المحادثة الحقيقية عبر هذا الكود في المرحلة 6.
        </p>
        <div class="code-box">${window.AppHelpers.esc(embedCode)}</div>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>إغلاق</button>
        <button type="button" class="btn btn-primary" id="copyEmbedBtn">نسخ الكود</button>
      `
    });

    document.getElementById('copyEmbedBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(embedCode);
        window.AppHelpers.toast('تم نسخ كود التضمين', 'success');
      } catch (error) {
        window.AppHelpers.toast('فشل النسخ التلقائي، انسخ الكود يدويًا', 'warning');
      }
    });
  }
};
