/**
 * ========================================
 * Dashboard Agents Page
 * CRUD حقيقي للوكلاء
 * ========================================
 */

window.Pages.dashboardAgents = {
  state: {
    agents: []
  },

  render: async function() {
    window.DashboardLayout.render('agents', 'الوكلاء', `
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">قائمة الوكلاء</h3>
          <button class="btn btn-primary" id="addAgentBtn">
            ${window.AppIcons.get('plus', { size: 16 })}
            <span>إضافة وكيل</span>
          </button>
        </div>
        <div id="agents-list">جاري التحميل...</div>
      </div>
    `);

    document.getElementById('addAgentBtn').addEventListener('click', () => {
      this.openAgentModal(null);
    });

    await this.loadAgents();
  },

  loadAgents: async function() {
    const client = window.AppAuth.getClient();
    const workspace = window.AppData.workspace;

    try {
      const { data, error } = await client
        .from('agents')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      this.state.agents = data || [];
      this.renderAgentsTable();
    } catch (error) {
      console.error(error);
      window.AppHelpers.toast('فشل تحميل الوكلاء: ' + error.message, 'error');
      document.getElementById('agents-list').innerHTML = `
        <div class="empty-state">تعذر تحميل البيانات</div>
      `;
    }
  },

  renderAgentsTable: function() {
    const container = document.getElementById('agents-list');

    if (!this.state.agents.length) {
      container.innerHTML = `
        <div class="empty-state">
          لا يوجد وكلاء بعد. اضغط على "إضافة وكيل" لإنشاء وكيل حقيقي.
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
              <th>النموذج</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.agents.map(agent => `
              <tr>
                <td>
                  <strong>${window.AppHelpers.esc(agent.name)}</strong><br>
                  <span class="small muted">${window.AppHelpers.esc(agent.description || '')}</span>
                </td>
                <td>${window.AppHelpers.esc(agent.model || 'gemini-3.1-flash-lite')}</td>
                <td>
                  ${agent.is_active
                    ? '<span class="badge badge-green">مفعل</span>'
                    : '<span class="badge badge-gray">موقوف</span>'}
                </td>
                <td>${window.AppHelpers.fmtDate(agent.created_at)}</td>
                <td>
                  <div style="display:flex; gap:8px;">
                    <button class="icon-btn" data-action="edit" data-id="${agent.id}" title="تعديل">
                      ${window.AppIcons.get('edit', { size: 16 })}
                    </button>
                    <button class="icon-btn" data-action="delete" data-id="${agent.id}" title="حذف">
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

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const agent = this.state.agents.find(a => a.id === btn.dataset.id);
        if (agent) this.openAgentModal(agent);
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agent = this.state.agents.find(a => a.id === btn.dataset.id);
        if (!agent) return;

        const ok = await window.Modals.confirm(
          'حذف الوكيل',
          `هل تريد حذف الوكيل "${agent.name}"؟ سيتم حذف بيانات مرتبطة به حسب قيود قاعدة البيانات.`,
          'حذف',
          true
        );

        if (!ok) return;

        try {
          const client = window.AppAuth.getClient();
          const { error } = await client
            .from('agents')
            .delete()
            .eq('id', agent.id)
            .eq('workspace_id', window.AppData.workspace.id);

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('تم حذف الوكيل بنجاح', 'success');
          await this.loadAgents();
        } catch (error) {
          window.AppHelpers.toast('فشل حذف الوكيل: ' + error.message, 'error');
        }
      });
    });
  },

  openAgentModal: function(agent) {
    const isEdit = Boolean(agent);

    window.Modals.open({
      title: isEdit ? 'تعديل وكيل' : 'إضافة وكيل جديد',
      body: `
        <form id="agentForm">
          <div class="form-group">
            <label class="form-label">اسم الوكيل *</label>
            <input type="text" name="name" class="form-input" required value="${window.AppHelpers.esc(agent?.name || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">الوصف</label>
            <input type="text" name="description" class="form-input" value="${window.AppHelpers.esc(agent?.description || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">تعليمات النظام (System Prompt) *</label>
            <textarea name="system_prompt" class="form-input" rows="6" required>${window.AppHelpers.esc(agent?.system_prompt || '')}</textarea>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">النموذج</label>
              <input type="text" name="model" class="form-input" value="gemini-3.1-flash-lite" readonly>
            </div>

            <div class="form-group">
              <label class="form-label">درجة الحرارة</label>
              <input type="number" name="temperature" class="form-input" step="0.1" min="0" max="2" value="${agent?.temperature ?? 0.7}">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">أقصى عدد رموز</label>
              <input type="number" name="max_tokens" class="form-input" min="100" value="${agent?.max_tokens ?? 2000}">
            </div>

            <div class="form-group">
              <label class="form-label">الحالة</label>
              <select name="is_active" class="form-input">
                <option value="true" ${agent?.is_active !== false ? 'selected' : ''}>مفعل</option>
                <option value="false" ${agent?.is_active === false ? 'selected' : ''}>موقوف</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">رسالة الترحيب</label>
            <textarea name="welcome_message" class="form-input" rows="3">${window.AppHelpers.esc(agent?.welcome_message || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">أسئلة مقترحة (كل سؤال في سطر)</label>
            <textarea name="suggested_questions" class="form-input" rows="4">${window.AppHelpers.esc((agent?.suggested_questions || []).join('\n'))}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>إلغاء</button>
        <button type="button" class="btn btn-primary" id="saveAgentBtn">حفظ</button>
      `
    });

    document.getElementById('saveAgentBtn').addEventListener('click', async () => {
      const form = document.getElementById('agentForm');

      if (!window.Forms.validate(form)) {
        window.AppHelpers.toast('يرجى تعبئة الحقول المطلوبة', 'error');
        return;
      }

      const values = window.Forms.get(form);

      const payload = {
        workspace_id: window.AppData.workspace.id,
        name: values.name,
        description: values.description || null,
        system_prompt: values.system_prompt,
        model: 'gemini-3.1-flash-lite',
        temperature: Number(values.temperature || 0.7),
        max_tokens: Number(values.max_tokens || 2000),
        welcome_message: values.welcome_message || null,
        suggested_questions: values.suggested_questions
          ? values.suggested_questions.split('\n').map(q => q.trim()).filter(Boolean)
          : [],
        is_active: values.is_active === true || values.is_active === 'true'
      };

      try {
        const client = window.AppAuth.getClient();
        let error;

        if (isEdit) {
          ({ error } = await client
            .from('agents')
            .update(payload)
            .eq('id', agent.id)
            .eq('workspace_id', window.AppData.workspace.id));
        } else {
          ({ error } = await client
            .from('agents')
            .insert(payload));
        }

        if (error) throw new Error(error.message);

        window.AppHelpers.toast(isEdit ? 'تم تحديث الوكيل بنجاح' : 'تم إنشاء الوكيل بنجاح', 'success');
        window.Modals.close();
        await this.loadAgents();
      } catch (error) {
        window.AppHelpers.toast('فشل حفظ الوكيل: ' + error.message, 'error');
      }
    });
  }
};
