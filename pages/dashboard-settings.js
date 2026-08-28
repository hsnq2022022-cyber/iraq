/**
 * ========================================
 * Dashboard Settings Page
 * إعدادات حقيقية لمساحة العمل والحساب
 * ========================================
 */

window.Pages.dashboardSettings = {
  render: async function() {
    const workspace = window.AppData.workspace;
    const user = window.AppData.user;

    window.DashboardLayout.render('settings', 'الإعدادات', `
      <div class="grid-2">
        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">إعدادات مساحة العمل</h3>
          </div>

          <form id="workspaceForm">
            <div class="form-group">
              <label class="form-label">اسم مساحة العمل *</label>
              <input type="text" name="name" class="form-input" required value="${window.AppHelpers.esc(workspace.name || '')}">
            </div>

            <div class="form-group">
              <label class="form-label">المعرّف الفريد (Slug) *</label>
              <input type="text" name="slug" class="form-input" required value="${window.AppHelpers.esc(workspace.slug || '')}" dir="ltr">
            </div>

            <div class="form-group">
              <label class="form-label">رابط الشعار</label>
              <input type="url" name="logo_url" class="form-input" value="${window.AppHelpers.esc(workspace.logo_url || '')}" dir="ltr">
            </div>

            <button type="button" class="btn btn-primary" id="saveWorkspaceBtn">حفظ مساحة العمل</button>
          </form>
        </div>

        <div class="page-section">
          <div class="section-header">
            <h3 class="section-title">المظهر واللغة</h3>
          </div>

          <div class="form-group">
            <label class="form-label">الوضع</label>
            <select id="settingsTheme" class="form-input">
              <option value="light" ${window.AppConfig.getCurrentTheme() === 'light' ? 'selected' : ''}>فاتح</option>
              <option value="dark" ${window.AppConfig.getCurrentTheme() === 'dark' ? 'selected' : ''}>داكن</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">اللغة</label>
            <select id="settingsLanguage" class="form-input">
              <option value="ar" ${window.AppConfig.getCurrentLanguage() === 'ar' ? 'selected' : ''}>العربية</option>
              <option value="en" ${window.AppConfig.getCurrentLanguage() === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>

          <div class="section-header" style="margin-top:18px;">
            <h3 class="section-title">الحساب</h3>
          </div>

          <div class="form-group">
            <label class="form-label">البريد الإلكتروني</label>
            <input type="email" class="form-input" value="${window.AppHelpers.esc(user.email || '')}" readonly>
          </div>

          <form id="passwordForm">
            <div class="form-group">
              <label class="form-label">كلمة المرور الجديدة</label>
              <input type="password" name="newPassword" class="form-input" minlength="6">
            </div>

            <div class="form-group">
              <label class="form-label">تأكيد كلمة المرور</label>
              <input type="password" name="confirmPassword" class="form-input" minlength="6">
            </div>

            <button type="button" class="btn btn-secondary" id="updatePasswordBtn">تحديث كلمة المرور</button>
          </form>
        </div>
      </div>

      <div class="page-section" style="border-color:#EF4444;">
        <div class="section-header">
          <h3 class="section-title" style="color:#EF4444;">منطقة الخطر</h3>
        </div>
        <p class="muted small">
          حذف مساحة العمل سيحذف الوكلاء وقاعدة المعرفة والويدجت والمحادثات المرتبطة بها نهائيًا.
        </p>
        <button class="btn btn-danger" id="deleteWorkspaceBtn">حذف مساحة العمل</button>
      </div>
    `);

    this.bindEvents(workspace);
  },

  bindEvents: function(workspace) {
    document.getElementById('saveWorkspaceBtn').addEventListener('click', async () => {
      const form = document.getElementById('workspaceForm');

      if (!window.Forms.validate(form)) {
        window.AppHelpers.toast('يرجى تعبئة الحقول المطلوبة', 'error');
        return;
      }

      const values = window.Forms.get(form);
      const client = window.AppAuth.getClient();

      try {
        const { data, error } = await client
          .from('workspaces')
          .update({
            name: values.name,
            slug: values.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            logo_url: values.logo_url || null
          })
          .eq('id', workspace.id)
          .eq('owner_id', window.AppData.user.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        window.AppData.workspace = data;
        window.AppHelpers.toast('تم حفظ إعدادات مساحة العمل', 'success');
        window.Router.navigate();
      } catch (error) {
        window.AppHelpers.toast('فشل حفظ الإعدادات: ' + error.message, 'error');
      }
    });

    document.getElementById('settingsTheme').addEventListener('change', (e) => {
      window.AppConfig.setCurrentTheme(e.target.value);
      window.Router.navigate();
    });

    document.getElementById('settingsLanguage').addEventListener('change', (e) => {
      window.AppConfig.setCurrentLanguage(e.target.value);
      window.Router.navigate();
    });

    document.getElementById('updatePasswordBtn').addEventListener('click', async () => {
      const values = window.Forms.get(document.getElementById('passwordForm'));

      if (!values.newPassword || values.newPassword.length < 6) {
        window.AppHelpers.toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
      }

      if (values.newPassword !== values.confirmPassword) {
        window.AppHelpers.toast('كلمتا المرور غير متطابقتين', 'error');
        return;
      }

      try {
        await window.AppAuth.updatePassword(values.newPassword);
        window.AppHelpers.toast('تم تحديث كلمة المرور بنجاح', 'success');
        document.getElementById('passwordForm').reset();
      } catch (error) {
        window.AppHelpers.toast('فشل تحديث كلمة المرور: ' + error.message, 'error');
      }
    });

    document.getElementById('deleteWorkspaceBtn').addEventListener('click', async () => {
      const ok = await window.Modals.confirm(
        'حذف مساحة العمل',
        'هل أنت متأكد تمامًا؟ لا يمكن التراجع عن هذا الإجراء.',
        'حذف نهائي',
        true
      );

      if (!ok) return;

      try {
        const client = window.AppAuth.getClient();
        const { error } = await client
          .from('workspaces')
          .delete()
          .eq('id', workspace.id)
          .eq('owner_id', window.AppData.user.id);

        if (error) throw new Error(error.message);

        window.AppHelpers.toast('تم حذف مساحة العمل', 'success');
        window.AppData.workspace = null;

        await window.AppAuth.signOut();
        window.location.hash = '#auth';
      } catch (error) {
        window.AppHelpers.toast('فشل حذف مساحة العمل: ' + error.message, 'error');
      }
    });
  }
};
