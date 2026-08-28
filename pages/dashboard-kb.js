/**
 * ========================================
 * Dashboard Knowledge Base Page
 * رفع / تعديل / حذف حقيقي
 * ========================================
 */

window.Pages.dashboardKb = {
  state: {
    docs: [],
    agents: []
  },

  render: async function() {
    window.DashboardLayout.render('kb', 'قاعدة المعرفة', `
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">المستندات</h3>
          <button class="btn btn-primary" id="addDocBtn">
            ${window.AppIcons.get('upload', { size: 16 })}
            <span>إضافة مستند</span>
          </button>
        </div>
        <div id="kb-list">جاري التحميل...</div>
      </div>
    `);

    document.getElementById('addDocBtn').addEventListener('click', () => {
      this.openDocModal();
    });

    await Promise.all([
      this.loadAgents(),
      this.loadDocs()
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

  loadDocs: async function() {
    const client = window.AppAuth.getClient();

    try {
      const { data, error } = await client
        .from('knowledge_docs')
        .select('*, agents(name)')
        .eq('workspace_id', window.AppData.workspace.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      this.state.docs = data || [];
      this.renderDocsTable();
    } catch (error) {
      window.AppHelpers.toast('فشل تحميل المستندات: ' + error.message, 'error');
    }
  },

  renderDocsTable: function() {
    const container = document.getElementById('kb-list');

    if (!this.state.docs.length) {
      container.innerHTML = `
        <div class="empty-state">
          لا توجد مستندات بعد. أضف ملف PDF أو Word أو Excel أو رابط أو نصًا مباشرًا.
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
              <th>النوع</th>
              <th>الوكيل</th>
              <th>الحالة</th>
              <th>القطع</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.docs.map(doc => `
              <tr>
                <td>
                  <strong>${window.AppHelpers.esc(doc.name)}</strong><br>
                  <span class="small muted">${window.AppHelpers.esc(doc.source_url || doc.file_path || '')}</span>
                </td>
                <td>${this.sourceBadge(doc.source_type)}</td>
                <td>${window.AppHelpers.esc(doc.agents?.name || 'عام')}</td>
                <td>${this.statusBadge(doc.status)}</td>
                <td>${doc.chunk_count || 0}</td>
                <td>${window.AppHelpers.fmtDate(doc.created_at)}</td>
                <td>
                  <div style="display:flex; gap:8px;">
                    <button class="icon-btn" data-action="refresh" data-id="${doc.id}" title="تحديث">
                      ${window.AppIcons.get('check', { size: 16 })}
                    </button>
                    <button class="icon-btn" data-action="delete" data-id="${doc.id}" title="حذف">
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

    container.querySelectorAll('[data-action="refresh"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.loadDocs();
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const doc = this.state.docs.find(d => d.id === btn.dataset.id);
        if (!doc) return;

        const ok = await window.Modals.confirm(
          'حذف المستند',
          `هل تريد حذف "${doc.name}"؟ سيتم حذف القطع المرتبطة به.`,
          'حذف',
          true
        );

        if (!ok) return;

        try {
          const client = window.AppAuth.getClient();
          const { error } = await client
            .from('knowledge_docs')
            .delete()
            .eq('id', doc.id)
            .eq('workspace_id', window.AppData.workspace.id);

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('تم حذف المستند بنجاح', 'success');
          await this.loadDocs();
        } catch (error) {
          window.AppHelpers.toast('فشل حذف المستند: ' + error.message, 'error');
        }
      });
    });
  },

  sourceBadge: function(type) {
    const map = {
      file: '<span class="badge badge-blue">ملف</span>',
      url: '<span class="badge badge-green">رابط</span>',
      text: '<span class="badge badge-gray">نص</span>',
      crawl: '<span class="badge badge-yellow">زحف</span>'
    };
    return map[type] || `<span class="badge badge-gray">${window.AppHelpers.esc(type)}</span>`;
  },

  statusBadge: function(status) {
    if (status === 'ready') return '<span class="badge badge-green">جاهز</span>';
    if (status === 'processing') return '<span class="badge badge-yellow">قيد المعالجة</span>';
    if (status === 'failed') return '<span class="badge badge-red">فشل</span>';
    return '<span class="badge badge-gray">قيد الانتظار</span>';
  },

  openDocModal: function() {
    window.Modals.open({
      title: 'إضافة مستند إلى قاعدة المعرفة',
      body: `
        <form id="docForm">
          <div class="form-group">
            <label class="form-label">اسم المستند *</label>
            <input type="text" name="name" class="form-input" required>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">نوع المصدر *</label>
              <select name="source_type" id="sourceType" class="form-input" required>
                <option value="file">ملف</option>
                <option value="url">رابط</option>
                <option value="text">نص مباشر</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">ربط بوكيل (اختياري)</label>
              <select name="agent_id" class="form-input">
                <option value="">عام - لكل الوكلاء</option>
                ${this.state.agents.map(agent => `
                  <option value="${agent.id}">${window.AppHelpers.esc(agent.name)}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="form-group" id="fileGroup">
            <label class="form-label">الملف (PDF / DOCX / XLSX / TXT / MD) *</label>
            <input type="file" name="file" id="fileInput" class="form-input" accept=".pdf,.docx,.xlsx,.txt,.md">
          </div>

          <div class="form-group" id="urlGroup" style="display:none;">
            <label class="form-label">الرابط *</label>
            <input type="url" name="source_url" class="form-input" placeholder="https://example.com">
          </div>

          <div class="form-group" id="textGroup" style="display:none;">
            <label class="form-label">النص *</label>
            <textarea name="text_content" class="form-input" rows="8"></textarea>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" data-modal-close>إلغاء</button>
        <button type="button" class="btn btn-primary" id="saveDocBtn">رفع ومعالجة</button>
      `
    });

    const sourceType = document.getElementById('sourceType');
    const fileGroup = document.getElementById('fileGroup');
    const urlGroup = document.getElementById('urlGroup');
    const textGroup = document.getElementById('textGroup');

    const toggleFields = () => {
      fileGroup.style.display = sourceType.value === 'file' ? 'block' : 'none';
      urlGroup.style.display = sourceType.value === 'url' ? 'block' : 'none';
      textGroup.style.display = sourceType.value === 'text' ? 'block' : 'none';
    };

    sourceType.addEventListener('change', toggleFields);
    toggleFields();

    document.getElementById('saveDocBtn').addEventListener('click', async () => {
      const form = document.getElementById('docForm');

      if (!window.Forms.validate(form)) {
        window.AppHelpers.toast('يرجى تعبئة الحقول المطلوبة', 'error');
        return;
      }

      const values = window.Forms.get(form);
      const client = window.AppAuth.getClient();

      const payload = {
        workspace_id: window.AppData.workspace.id,
        agent_id: values.agent_id || null,
        name: values.name,
        source_type: values.source_type,
        status: 'pending',
        metadata: {}
      };

      try {
        if (values.source_type === 'file') {
          const file = document.getElementById('fileInput').files[0];
          if (!file) {
            window.AppHelpers.toast('يرجى اختيار ملف', 'error');
            return;
          }

          payload.file_path = file.name;
          payload.file_size = file.size;
          payload.file_type = file.type || 'unknown';

          const { data: doc, error } = await client
            .from('knowledge_docs')
            .insert(payload)
            .select()
            .single();

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('بدأ رفع ومعالجة الملف', 'info');
          window.Modals.close();
          await this.loadDocs();

          await window.AppKBIngest.processFile(file, doc.id, values.agent_id || null);
          await this.loadDocs();
          window.AppHelpers.toast('تمت معالجة الملف بنجاح', 'success');
        }

        if (values.source_type === 'url') {
          if (!values.source_url) {
            window.AppHelpers.toast('يرجى إدخال رابط صحيح', 'error');
            return;
          }

          payload.source_url = values.source_url;

          const { data: doc, error } = await client
            .from('knowledge_docs')
            .insert(payload)
            .select()
            .single();

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('بدأ زحف الرابط ومعالجته', 'info');
          window.Modals.close();
          await this.loadDocs();

          await window.AppKBIngest.processUrl(values.source_url, doc.id, values.agent_id || null);
          await this.loadDocs();
          window.AppHelpers.toast('تمت معالجة الرابط بنجاح', 'success');
        }

        if (values.source_type === 'text') {
          if (!values.text_content) {
            window.AppHelpers.toast('يرجى إدخال النص', 'error');
            return;
          }

          const { data: doc, error } = await client
            .from('knowledge_docs')
            .insert(payload)
            .select()
            .single();

          if (error) throw new Error(error.message);

          window.AppHelpers.toast('بدأ معالجة النص', 'info');
          window.Modals.close();
          await this.loadDocs();

          await window.AppKBIngest.processText(values.text_content, doc.id, values.agent_id || null);
          await this.loadDocs();
          window.AppHelpers.toast('تمت معالجة النص بنجاح', 'success');
        }
      } catch (error) {
        console.error(error);
        window.AppHelpers.toast('فشل حفظ أو معالجة المستند: ' + error.message, 'error');
        await this.loadDocs();
      }
    });
  }
};
