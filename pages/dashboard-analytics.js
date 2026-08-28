/**
 * ========================================
 * Dashboard Analytics Page
 * حسابات حقيقية من قاعدة البيانات
 * ========================================
 */

window.Pages.dashboardAnalytics = {
  render: async function() {
    window.DashboardLayout.render('analytics', 'التحليلات', `
      <div id="analytics-content">جاري تحميل التحليلات...</div>
    `);

    await this.loadAnalytics();
  },

  loadAnalytics: async function() {
    const client = window.AppAuth.getClient();
    const workspace = window.AppData.workspace;

    try {
      const countOptions = { count: 'exact', head: true };

      const [
        totalConversations,
        activeConversations,
        closedConversations,
        archivedConversations,
        totalMessages,
        totalContacts,
        agents
      ] = await Promise.all([
        client.from('conversations').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('conversations').select('*', countOptions).eq('workspace_id', workspace.id).eq('status', 'active'),
        client.from('conversations').select('*', countOptions).eq('workspace_id', workspace.id).eq('status', 'closed'),
        client.from('conversations').select('*', countOptions).eq('workspace_id', workspace.id).eq('status', 'archived'),
        client.from('messages').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('contacts').select('*', countOptions).eq('workspace_id', workspace.id),
        client.from('agents').select('id, name').eq('workspace_id', workspace.id)
      ]);

      if (totalConversations.error) throw new Error(totalConversations.error.message);
      if (activeConversations.error) throw new Error(activeConversations.error.message);
      if (closedConversations.error) throw new Error(closedConversations.error.message);
      if (archivedConversations.error) throw new Error(archivedConversations.error.message);
      if (totalMessages.error) throw new Error(totalMessages.error.message);
      if (totalContacts.error) throw new Error(totalContacts.error.message);
      if (agents.error) throw new Error(agents.error.message);

      const messagesByDay = await this.getMessagesLast14Days(client, workspace.id);
      const topAgents = await this.getTopAgents(client, workspace.id, agents.data || []);

      this.renderAnalytics({
        totalConversations: totalConversations.count || 0,
        activeConversations: activeConversations.count || 0,
        closedConversations: closedConversations.count || 0,
        archivedConversations: archivedConversations.count || 0,
        totalMessages: totalMessages.count || 0,
        totalContacts: totalContacts.count || 0,
        messagesByDay,
        topAgents
      });
    } catch (error) {
      console.error(error);
      document.getElementById('analytics-content').innerHTML = `
        <div class="empty-state">فشل تحميل التحليلات: ${window.AppHelpers.esc(error.message)}</div>
      `;
      window.AppHelpers.toast('فشل تحميل التحليلات', 'error');
    }
  },

  getMessagesLast14Days: async function(client, workspaceId) {
    const days = [];

    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const { count, error } = await client
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', day.toISOString())
        .lt('created_at', nextDay.toISOString());

      if (error) throw new Error(error.message);

      days.push({
        label: day.toLocaleDateString('ar', { day: '2-digit', month: '2-digit' }),
        count: count || 0
      });
    }

    return days;
  },

  getTopAgents: async function(client, workspaceId, agents) {
    const results = [];

    for (const agent of agents) {
      const { count, error } = await client
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('agent_id', agent.id);

      if (error) throw new Error(error.message);

      results.push({
        name: agent.name,
        count: count || 0
      });
    }

    return results.sort((a, b) => b.count - a.count).slice(0, 5);
  },

  renderAnalytics: function(data) {
    const maxMessages = Math.max(...data.messagesByDay.map(d => d.count), 1);

    document.getElementById('analytics-content').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">إجمالي المحادثات</div>
          <div class="stat-value">${data.totalConversations}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">المحادثات النشطة</div>
          <div class="stat-value">${data.activeConversations}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">إجمالي الرسائل</div>
          <div class="stat-value">${data.totalMessages}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">العملاء</div>
          <div class="stat-value">${data.totalContacts}</div>
        </div>
      </div>

      <div style="height:18px"></div>

      <div class="grid-2">
        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">الرسائل خلال آخر 14 يومًا</h3>
          </div>

          <div class="chart-bars">
            ${data.messagesByDay.map(day => `
              <div class="chart-bar" style="height:${(day.count / maxMessages) * 100}%;" title="${day.label}: ${day.count}"></div>
            `).join('')}
          </div>

          <div class="chart-labels">
            ${data.messagesByDay.map(day => `
              <div style="flex:1; text-align:center; font-size:0.7rem; color:var(--text-secondary);">
                ${day.label}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">المحادثات حسب الحالة</h3>
          </div>

          <div class="table-wrap">
            <table class="table">
              <tbody>
                <tr>
                  <td>نشطة</td>
                  <td><span class="badge badge-green">${data.activeConversations}</span></td>
                </tr>
                <tr>
                  <td>مغلقة</td>
                  <td><span class="badge badge-gray">${data.closedConversations}</span></td>
                </tr>
                <tr>
                  <td>مؤرشفة</td>
                  <td><span class="badge badge-blue">${data.archivedConversations}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style="height:18px"></div>

      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">أفضل الوكلاء حسب عدد المحادثات</h3>
        </div>

        ${data.topAgents.length
          ? `
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>الوكيل</th>
                    <th>عدد المحادثات</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.topAgents.map(agent => `
                    <tr>
                      <td>${window.AppHelpers.esc(agent.name)}</td>
                      <td>${agent.count}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `
          : '<div class="empty-state">لا يوجد وكلاء بعد</div>'}
      </div>
    `;
  }
};
