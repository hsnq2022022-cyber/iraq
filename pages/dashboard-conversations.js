/**
 * ========================================
 * Dashboard Conversations Page
 * قراءة حقيقية للرسائل + إدارة الحالة
 * ========================================
 */

window.Pages.dashboardConversations = {
  state: {
    conversations: [],
    activeConversation: null,
    messages: []
  },

  render: async function() {
    window.DashboardLayout.render('conversations', 'المحادثات', `
      <div class="grid-2">
        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">قائمة المحادثات</h3>
          </div>
          <div id="conversations-list">جاري التحميل...</div>
        </div>

        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">تفاصيل المحادثة</h3>
          </div>
          <div id="conversation-details">اختر محادثة لعرض الرسائل الحقيقية.</div>
        </div>
      </div>
    `);

    await this.loadConversations();
  },

  loadConversations: async function() {
    const client = window.AppAuth.getClient();

    try {
      const { data, error } = await client
        .from('conversations')
        .select('*, agents(name), contacts(name, email)')
        .eq('workspace_id', window.AppData.workspace.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw new Error(error.message);

      this.state.conversations = data || [];
      this.renderConversationsList();
    } catch (error) {
      window.AppHelpers.toast('فشل تحميل المحادثات: ' + error.message, 'error');
    }
  },

  renderConversationsList: function() {
    const container = document.getElementById('conversations-list');

    if (!this.state.conversations.length) {
      container.innerHTML = `
        <div class="empty-state">لا توجد محادثات بعد.</div>
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
              <th>العميل</th>
              <th>الحالة</th>
              <th>عدد الرسائل</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.conversations.map(conversation => `
              <tr style="cursor:pointer;" data-conversation="${conversation.id}">
                <td>${window.AppHelpers.esc(conversation.title || 'بدون عنوان')}</td>
                <td>${window.AppHelpers.esc(conversation.agents?.name || '—')}</td>
                <td>${window.AppHelpers.esc(conversation.contacts?.name || conversation.contacts?.email || 'زائر')}</td>
                <td>${this.statusBadge(conversation.status)}</td>
                <td>${conversation.message_count || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-conversation]').forEach(row => {
      row.addEventListener('click', async () => {
        const conversation = this.state.conversations.find(c => c.id === row.dataset.conversation);
        if (conversation) {
          this.state.activeConversation = conversation;
          await this.loadMessages(conversation.id);
        }
      });
    });
  },

  statusBadge: function(status) {
    if (status === 'active') return '<span class="badge badge-green">نشطة</span>';
    if (status === 'closed') return '<span class="badge badge-gray">مغلقة</span>';
    if (status === 'archived') return '<span class="badge badge-blue">مؤرشفة</span>';
    return '<span class="badge badge-gray">غير معروف</span>';
  },

  loadMessages: async function(conversationId) {
    const client = window.AppAuth.getClient();
    const details = document.getElementById('conversation-details');

    details.innerHTML = 'جاري تحميل الرسائل...';

    try {
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw new Error(error.message);

      this.state.messages = data || [];
      this.renderConversationDetails();
    } catch (error) {
      details.innerHTML = `
        <div class="empty-state">فشل تحميل الرسائل: ${window.AppHelpers.esc(error.message)}</div>
      `;
    }
  },

  renderConversationDetails: function() {
    const details = document.getElementById('conversation-details');
    const conversation = this.state.activeConversation;

    if (!conversation) return;

    details.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
        <div>
          <h4 style="margin:0 0 6px 0;">${window.AppHelpers.esc(conversation.title || 'بدون عنوان')}</h4>
          <div class="small muted">
            الوكيل: ${window.AppHelpers.esc(conversation.agents?.name || '—')} |
            العميل: ${window.AppHelpers.esc(conversation.contacts?.name || conversation.contacts?.email || 'زائر')}
          </div>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <select id="conversationStatus" class="form-input" style="width:auto;">
            <option value="active" ${conversation.status === 'active' ? 'selected' : ''}>نشطة</option>
            <option value="closed" ${conversation.status === 'closed' ? 'selected' : ''}>مغلقة</option>
            <option value="archived" ${conversation.status === 'archived' ? 'selected' : ''}>مؤرشفة</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="updateStatusBtn">تحديث الحالة</button>
          <button class="btn btn-danger btn-sm" id="deleteConversationBtn">حذف</button>
        </div>
      </div>

      <div class="chat-box" style="height:420px;">
        ${this.state.messages.length
          ? this.state.messages.map(message => `
              <div class="chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}">
                ${window.AppHelpers.esc(message.content)}
              </div>
            `).join('')
          : '<div class="empty-state">لا توجد رسائل في هذه المحادثة</div>'}
      </div>
    `;

    document.getElementById('updateStatusBtn').addEventListener('click', async () => {
      const status = document.getElementById('conversationStatus').value;

      try {
        const client = window.AppAuth.getClient();
        const { error } = await client
          .from('conversations')
          .update({ status })
          .eq('id', conversation.id)
          .eq('workspace_id', window.AppData.workspace.id);

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم تحديث حالة المحادثة', 'success');
        await this.loadConversations();
      } catch (error) {
        window.AppHelpers.toast('فشل تحديث الحالة: ' + error.message, 'error');
      }
    });

    document.getElementById('deleteConversationBtn').addEventListener('click', async () => {
      const ok = await window.Modals.confirm(
        'حذف المحادثة',
        'سيتم حذف المحادثة ورسائلها نهائيًا. هل أنت متأكد؟',
        'حذف',
        true
      );

      if (!ok) return;

      try {
        const client = window.AppAuth.getClient();
        const { error } = await client
          .from('conversations')
          .delete()
          .eq('id', conversation.id)
          .eq('workspace_id', window.AppData.workspace.id);

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم حذف المحادثة', 'success');
        this.state.activeConversation = null;
        this.state.messages = [];
        document.getElementById('conversation-details').innerHTML = 'اختر محادثة لعرض الرسائل الحقيقية.';
        await this.loadConversations();
      } catch (error) {
        window.AppHelpers.toast('فشل حذف المحادثة: ' + error.message, 'error');
      }
    });
  }
};
