/**
 * ========================================
 * Dashboard Billing Page
 * عرض وتحديث الخطة الحقيقية من قاعدة البيانات
 * ========================================
 */

window.Pages.dashboardBilling = {
  render: async function() {
    const workspace = window.AppData.workspace;

    window.DashboardLayout.render('billing', 'الاشتراك', `
      <div class="page-section">
        <div class="section-header">
          <h3 class="section-title">الخطة الحالية</h3>
        </div>

        <p>
          الخطة الحالية:
          <strong>${window.AppHelpers.esc(this.planLabel(workspace.plan))}</strong>
          —
          حالة الاشتراك:
          <strong>${window.AppHelpers.esc(workspace.subscription_status || 'active')}</strong>
        </p>

        <p class="small muted">
          هذه الصفحة تقرأ وتحدّث بيانات الخطة الحقيقية من جدول <code>workspaces</code>.
          لا توجد بوابة دفع مدمجة بعد، لذلك التغيير هنا هو تحديث مباشر للخطة في قاعدة البيانات.
        </p>
      </div>

      <div class="grid-3" id="plans-container">
        ${this.renderPlanCard('free', 'مجانية', ['وكيل واحد', 'قاعدة معرفة أساسية', 'ويدجت واحد'], workspace)}
        ${this.renderPlanCard('pro', 'احترافية', ['عدد أكبر من الوكلاء', 'قاعدة معرفة موسعة', 'تحليلات متقدمة'], workspace)}
        ${this.renderPlanCard('enterprise', 'مؤسسات', ['تكاملات مخصصة', 'دعم أولوية', 'صلاحيات متقدمة'], workspace)}
      </div>
    `);

    this.bindEvents(workspace);
  },

  planLabel: function(plan) {
    const labels = {
      free: 'مجانية',
      pro: 'احترافية',
      enterprise: 'مؤسسات'
    };
    return labels[plan] || plan;
  },

  renderPlanCard: function(plan, title, features, workspace) {
    const isCurrent = workspace.plan === plan;

    const featuresHtml = Array.isArray(features)
      ? features.map(feature => `<li>${window.AppHelpers.esc(feature)}</li>`).join('')
      : `<li>${window.AppHelpers.esc(features)}</li>`;

    return `
      <div class="plan-card ${isCurrent ? 'current' : ''}">
        <h3 style="margin-top:0;">${window.AppHelpers.esc(title)}</h3>
        <ul class="small muted">
          ${featuresHtml}
        </ul>
        <button class="btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}" data-plan="${plan}" ${isCurrent ? 'disabled' : ''}>
          ${isCurrent ? 'الخطة الحالية' : 'اختيار الخطة'}
        </button>
      </div>
    `;
  },

  bindEvents: function(workspace) {
    document.querySelectorAll('[data-plan]').forEach(button => {
      button.addEventListener('click', async () => {
        const plan = button.dataset.plan;

        const ok = await window.Modals.confirm(
          'تغيير الخطة',
          `هل تريد تغيير خطة الاشتراك إلى "${this.planLabel(plan)}"؟ سيتم تحديث قاعدة البيانات مباشرة.`,
          'تغيير',
          false
        );

        if (!ok) return;

        try {
          const client = window.AppAuth.getClient();
          const { data, error } = await client
            .from('workspaces')
            .update({
              plan,
              subscription_status: 'active'
            })
            .eq('id', workspace.id)
            .eq('owner_id', window.AppData.user.id)
            .select()
            .single();

          if (error) throw new Error(error.message);

          window.AppData.workspace = data;
          window.AppHelpers.toast('تم تحديث الخطة بنجاح', 'success');
          window.Router.navigate();
        } catch (error) {
          window.AppHelpers.toast('فشل تحديث الخطة: ' + error.message, 'error');
        }
      });
    });
  }
};
