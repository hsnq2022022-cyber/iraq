/**
 * ========================================
 * Dashboard Contacts Page
 * CRUD حقيقي للعملاء
 * ========================================
 */

window.Pages.dashboardContacts = {
  state: {
    contacts: []
  },

  render: async function() {
    window.DashboardLayout.render('contacts', 'العملاء', `
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">قائمة العملاء</h3>
          <button class="btn btn-primary" id="addContactBtn">
            ${window.AppIcons.get('plus', { size: 16 })}
            <span>إضافة عميل</span>
          </button>
        </div>
        <div id="contacts-list">جاري التحميل...</div>
      </div>
    `);

    document.getElementById('addContactBtn').addEventListener('click', () => {
      this.openContactModal(null);
    });

    await this.loadContacts();
  },

  loadContacts: async function() {
    const client = window.AppAuth.getClient();

    try {
      const { data, error } = await client
        .from('contacts')
        .select('*')
        .eq('workspace_id', window.AppData.workspace.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      this.state.contacts = data || [];
      this.renderContactsTable();
    } catch (error) {
      window.AppHelpers.toast('فشل تحميل العملاء: ' + error.message, 'error');
    }
  },

  renderContactsTable: function() {
    const container = document.getElementById('contacts-list');

    if (!this.state.contacts.length) {
      container.innerHTML = `
        <div class="empty-state">لا يوجد عملاء بعد.</div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>الشركة</th>
              <th>المصدر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.contacts.map(contact => `
              <tr>
                <td>${window.AppHelpers.esc(contact.name || '—')}</td>
                <td>${window.AppHelpers.esc(contact.email || '—')}</td>
                <td>${window.AppHelpers.esc(contact.phone || '—')}</td>
                <td>${window.AppHelpers.esc(contact.company || '—')}</td>
                <td>${window.AppHelpers.esc(contact.source || '—')}</td>
                <td>
                  <div style="display:flex; gap:8px;">
                    <button class="icon-btn" data-action="edit" data-id="${contact.id}">
                      ${window.AppIcons.get('edit', { size: 16 })}
                    </button>
                    <button class="icon-btn" data-action="delete" data-id="${contact.id}">
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
        const contact = this.state.contacts.find(c => c.id === btn.dataset.id);
        if (contact) this.openContactModal(contact);
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const contact = this.state.contacts.find(c => c.id === btn.dataset.id);
        if (!contact) return;

        const ok = await window.Modals.confirm(
          'حذف العميل',
          `هل تريد حذف "${contact.name || contact.email || 'هذا العميل'}"؟`,
          'حذف',
          true
        );

        if (!ok) return;

        try {
          const client = window.AppAuth.getClient();
          const { error } = await client
            .from('contacts')
            .delete()
            .eq('id', contact.id)
            .eq('workspace_id', window.AppData.workspace.id);

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('تم حذف العميل', 'success');
          await this.loadContacts();
        } catch (error) {
          window.AppHelpers.toast('فشل حذف العميل: ' + error.message, 'error');
        }
      });
    });
  },

  openContactModal: function(contact) {
    const isEdit = Boolean(contact);

    window.Modals.open({
      title: isEdit ? 'تعديل عميل' : 'إضافة عميل',
      body: `
        <form id="contactForm">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">الاسم *</label>
              <input type="text" name="name" class="form-input" required value="${window.AppHelpers.esc(contact?.name || '')}">
            </div>

            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" name="email" class="form-input" value="${window.AppHelpers.esc(contact?.email || '')}">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">الهاتف</label>
              <input type="text" name="phone" class="form-input" value="${window.AppHelpers.esc(contact?.phone || '')}">
            </div>

            <div class="form-group">
              <label class="form-label">الشركة</label>
              <input type="text" name="company" class="form-input" value="${window.AppHelpers.esc(contact?.company || '')}">
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">المصدر</label>
              <select name="source" class="form-input">
                <option value="manual" ${contact?.source === 'manual' ? 'selected' : ''}>يدوي</option>
                <option value="widget" ${contact?.source === 'widget' ? 'selected' : ''}>ويدجت</option>
                <option value="import" ${contact?.source === 'import' ? 'selected' : ''}>استيراد</option>
                <option value="api" ${contact?.source === 'api' ? 'selected' : ''}>API</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">الوسوم (مفصولة بفواصل)</label>
              <input type="text" name="tags" class="form-input" value="${window.AppHelpers.esc((contact?.tags || []).join(', '))}">
            </div>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>إلغاء</button>
        <button type="button" class="btn btn-primary" id="saveContactBtn">حفظ</button>
      `
    });

    document.getElementById('saveContactBtn').addEventListener('click', async () => {
      const form = document.getElementById('contactForm');

      if (!window.Forms.validate(form)) {
        window.AppHelpers.toast('يرجى تعبئة الحقول المطلوبة', 'error');
        return;
      }

      const values = window.Forms.get(form);

      const payload = {
        workspace_id: window.AppData.workspace.id,
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        company: values.company || null,
        source: values.source || 'manual',
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      try {
        const client = window.AppAuth.getClient();
        let error;

        if (isEdit) {
          ({ error } = await client
            .from('contacts')
            .update(payload)
            .eq('id', contact.id)
            .eq('workspace_id', window.AppData.workspace.id));
        } else {
          ({ error } = await client
            .from('contacts')
            .insert(payload));
        }

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم حفظ العميل بنجاح', 'success');
        window.Modals.close();
        await this.loadContacts();
      } catch (error) {
        window.AppHelpers.toast('فشل حفظ العميل: ' + error.message, 'error');
      }
    });
  }
};
