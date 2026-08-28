/**
 * ========================================
 * Dashboard Builder Page
 * معاينة حية للويدجت + اختبار حقيقي للمحادثة
 * ========================================
 */

window.Pages.dashboardBuilder = {
  state: {
    agents: [],
    widgets: [],
    messages: []
  },

  render: async function() {
    window.DashboardLayout.render('builder', 'منشئ الويدجت', `
      <div class="grid-2">
        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">إعدادات الويدجت</h3>
          </div>

          <form id="builderForm">
            <div class="form-group">
              <label class="form-label">اختر ويدجت للحفظ (اختياري)</label>
              <select name="widget_id" id="builderWidget" class="form-input">
                <option value="">معاينة فقط بدون حفظ</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">الوكيل *</label>
              <select name="agent_id" id="builderAgent" class="form-input" required></select>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">اللون الأساسي</label>
                <input type="color" name="primaryColor" id="primaryColor" class="form-input" value="#0ABAB5" style="height:46px; padding:6px;">
              </div>

              <div class="form-group">
                <label class="form-label">موضع الويدجت</label>
                <select name="position" id="widgetPosition" class="form-input">
                  <option value="bottom-right">أسفل اليمين</option>
                  <option value="bottom-left">أسفل اليسار</option>
                </select>
              </div>
            </div>

            <button type="button" class="btn btn-primary" id="saveBuilderBtn">حفظ إعدادات الويدجت</button>
          </form>

          <div style="height:18px"></div>

          <div class="section-header">
            <h3 class="section-title">اختبار المحادثة الحقيقية</h3>
          </div>

          <div id="builder-chat" class="chat-box"></div>

          <div class="chat-input-row">
            <input type="text" id="builderMessage" class="form-input" placeholder="اكتب رسالة لاختبار الوكيل...">
            <button class="btn btn-primary" id="sendBuilderMessage">إرسال</button>
          </div>
        </div>

        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">معاينة الويدجت</h3>
          </div>

          <div id="widgetPreview"></div>
        </div>
      </div>
    `);

    await this.loadData();
    this.bindEvents();
    this.renderPreview();
    this.renderMessages();
  },

  loadData: async function() {
    const client = window.AppAuth.getClient();

    const [agents, widgets] = await Promise.all([
      client
        .from('agents')
        .select('*')
        .eq('workspace_id', window.AppData.workspace.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      client
        .from('widgets')
        .select('*, agents(name)')
        .eq('workspace_id', window.AppData.workspace.id)
        .order('created_at', { ascending: false })
    ]);

    if (agents.error) throw new Error(agents.error.message);
    if (widgets.error) throw new Error(widgets.error.message);

    this.state.agents = agents.data || [];
    this.state.widgets = widgets.data || [];

    const widgetSelect = document.getElementById('builderWidget');
    widgetSelect.innerHTML = `
      <option value="">معاينة فقط بدون حفظ</option>
      ${this.state.widgets.map(widget => `
        <option value="${widget.id}">${window.AppHelpers.esc(widget.name)} (${window.AppHelpers.esc(widget.agents?.name || '')})</option>
      `).join('')}
    `;

    const agentSelect = document.getElementById('builderAgent');
    agentSelect.innerHTML = this.state.agents.length
      ? this.state.agents.map(agent => `
          <option value="${agent.id}">${window.AppHelpers.esc(agent.name)}</option>
        `).join('')
      : '<option value="">لا يوجد وكلاء مفعلون</option>';

    if (this.state.widgets.length) {
      widgetSelect.value = this.state.widgets[0].id;
      this.applyWidgetToForm(this.state.widgets[0]);
    }
  },

  bindEvents: function() {
    const widgetSelect = document.getElementById('builderWidget');
    const agentSelect = document.getElementById('builderAgent');
    const primaryColor = document.getElementById('primaryColor');
    const position = document.getElementById('widgetPosition');

    widgetSelect.addEventListener('change', () => {
      const widget = this.state.widgets.find(w => w.id === widgetSelect.value);
      if (widget) {
        this.applyWidgetToForm(widget);
        this.renderPreview();
      }
    });

    [agentSelect, primaryColor, position].forEach(field => {
      field.addEventListener('input', () => this.renderPreview());
    });

    document.getElementById('saveBuilderBtn').addEventListener('click', async () => {
      const values = window.Forms.get(document.getElementById('builderForm'));

      if (!values.widget_id) {
        window.AppHelpers.toast('اختر ويدجت من القائمة إذا أردت الحفظ، أو أنشئ ويدجت من صفحة الويدجت', 'warning');
        return;
      }

      if (!values.agent_id) {
        window.AppHelpers.toast('يجب اختيار وكيل', 'error');
        return;
      }

      try {
        const client = window.AppAuth.getClient();
        const { error } = await client
          .from('widgets')
          .update({
            agent_id: values.agent_id,
            theme: {
              primaryColor: values.primaryColor,
              position: values.position
            }
          })
          .eq('id', values.widget_id)
          .eq('workspace_id', window.AppData.workspace.id);

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم حفظ إعدادات الويدجت بنجاح', 'success');
        await this.loadData();
      } catch (error) {
        window.AppHelpers.toast('فشل حفظ الإعدادات: ' + error.message, 'error');
      }
    });

    document.getElementById('sendBuilderMessage').addEventListener('click', () => this.sendMessage());
    document.getElementById('builderMessage').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  },

  applyWidgetToForm: function(widget) {
    document.getElementById('builderAgent').value = widget.agent_id || '';
    document.getElementById('primaryColor').value = widget.theme?.primaryColor || '#0ABAB5';
    document.getElementById('widgetPosition').value = widget.theme?.position || 'bottom-right';
  },

  getSelectedAgent: function() {
    const agentId = document.getElementById('builderAgent').value;
    return this.state.agents.find(agent => agent.id === agentId) || null;
  },

  renderPreview: function() {
    const agent = this.getSelectedAgent();
    const primaryColor = document.getElementById('primaryColor').value;
    const position = document.getElementById('widgetPosition').value;

    const preview = document.getElementById('widgetPreview');

    if (!agent) {
      preview.innerHTML = `
        <div class="empty-state">اختر وكيلًا لعرض المعاينة</div>
      `;
      return;
    }

    const suggestions = (agent.suggested_questions || []).slice(0, 3).map(question => `
      <span class="widget-suggestion">${window.AppHelpers.esc(question)}</span>
    `).join('<br>');

    preview.innerHTML = `
      <div class="widget-preview" style="--widget-primary:${primaryColor};">
        <div class="widget-preview-header">
          ${window.AppHelpers.esc(agent.name)}
          <div class="small" style="opacity:0.9;">${window.AppHelpers.esc(position === 'bottom-right' ? 'أسفل اليمين' : 'أسفل اليسار')}</div>
        </div>
        <div class="widget-preview-body">
          <p><strong>رسالة الترحيب:</strong></p>
          <p class="muted">${window.AppHelpers.esc(agent.welcome_message || 'مرحبًا، كيف يمكنني مساعدتك؟')}</p>
          <div style="margin-top:10px;">
            ${suggestions || '<span class="muted small">لا توجد أسئلة مقترحة</span>'}
          </div>
        </div>
      </div>
    `;
  },

  renderMessages: function() {
    const chatBox = document.getElementById('builder-chat');

    if (!this.state.messages.length) {
      chatBox.innerHTML = `
        <div class="empty-state">
          أرسل رسالة لاختبار الوكيل الحقيقي مع RAG.
        </div>
      `;
      return;
    }

    chatBox.innerHTML = this.state.messages.map(message => `
      <div class="chat-message ${message.role}">${window.AppHelpers.esc(message.content)}</div>
    `).join('');

    chatBox.scrollTop = chatBox.scrollHeight;
  },

  sendMessage: async function() {
    const input = document.getElementById('builderMessage');
    const message = input.value.trim();
    const agent = this.getSelectedAgent();

    if (!agent) {
      window.AppHelpers.toast('اختر وكيلًا أولًا', 'error');
      return;
    }

    if (!message) return;

    input.value = '';
    this.state.messages.push({ role: 'user', content: message });
    this.state.messages.push({ role: 'assistant', content: 'جاري الكتابة...' });
    this.renderMessages();

    try {
      const result = await window.AppAI.askAI(agent.id, null, message);

      this.state.messages[this.state.messages.length - 1] = {
        role: 'assistant',
        content: result.response || 'لم يتم استلام رد'
      };

      this.renderMessages();
    } catch (error) {
      this.state.messages[this.state.messages.length - 1] = {
        role: 'assistant',
        content: `خطأ: ${error.message}`
      };
      this.renderMessages();
      window.AppHelpers.toast('فشل اختبار المحادثة: ' + error.message, 'error');
    }
  }
};
