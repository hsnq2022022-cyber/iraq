/**
 * ========================================
 * Auth Page
 * ========================================
 * صفحة المصادقة (تسجيل دخول/تسجيل جديد/استعادة كلمة المرور)
 */

window.Pages = window.Pages || {};

window.Pages.auth = {
  currentView: 'login', // login, signup, reset, update-password
  
  render: function() {
    const app = document.getElementById('app');
    app.innerHTML = this.getHTML();
    this.bindEvents();
  },

  getHTML: function() {
    const lang = window.AppConfig ? window.AppConfig.getCurrentLanguage() : 'ar';
    
    return `
      <div class="auth-page">
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <div class="auth-logo">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#0ABAB5"/>
                  <path d="M16 20L24 12L32 20M24 12V36" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 class="auth-title">${this.getTitle()}</h1>
              <p class="auth-subtitle">${this.getSubtitle()}</p>
            </div>

            <div class="auth-form-container">
              ${this.getFormHTML()}
            </div>

            <div class="auth-footer">
              ${this.getFooterHTML()}
            </div>
          </div>

          <div class="auth-theme-toggle">
            <button id="themeToggle" class="theme-toggle-btn" title="تبديل الوضع">
              ${window.AppIcons.get('sun', { size: 20 })}
            </button>
            <button id="langToggle" class="lang-toggle-btn" title="تغيير اللغة">
              ${lang === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  getTitle: function() {
    const titles = {
      login: window.AppHelpers.t('login'),
      signup: window.AppHelpers.t('register'),
      reset: 'استعادة كلمة المرور',
      'update-password': 'تحديث كلمة المرور'
    };
    return titles[this.currentView] || titles.login;
  },

  getSubtitle: function() {
    const subtitles = {
      login: 'سجل دخولك للوصول إلى لوحة التحكم',
      signup: 'أنشئ حسابك الجديد وابدأ الآن',
      reset: 'أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة',
      'update-password': 'أدخل كلمة المرور الجديدة'
    };
    return subtitles[this.currentView] || subtitles.login;
  },

  getFormHTML: function() {
    switch(this.currentView) {
      case 'login':
        return this.getLoginForm();
      case 'signup':
        return this.getSignupForm();
      case 'reset':
        return this.getResetForm();
      case 'update-password':
        return this.getUpdatePasswordForm();
      default:
        return this.getLoginForm();
    }
  },

  getLoginForm: function() {
    return `
      <form id="loginForm" class="auth-form">
        <div class="form-group">
          <label class="form-label">${window.AppHelpers.t('email')}</label>
          <input 
            type="email" 
            id="loginEmail" 
            class="form-input" 
            placeholder="example@domain.com"
            required
            autocomplete="email"
          >
        </div>

        <div class="form-group">
          <label class="form-label">${window.AppHelpers.t('password')}</label>
          <div class="password-input-wrapper">
            <input 
              type="password" 
              id="loginPassword" 
              class="form-input" 
              placeholder="••••••••"
              required
              autocomplete="current-password"
            >
            <button type="button" class="password-toggle" data-target="loginPassword">
              ${window.AppIcons.get('eye', { size: 20 })}
            </button>
          </div>
        </div>

        <div class="form-group">
          <a href="#" class="auth-link" data-view="reset">
            نسيت كلمة المرور؟
          </a>
        </div>

        <button type="submit" class="btn btn-primary btn-block">
          <span class="btn-text">${window.AppHelpers.t('login')}</span>
          <span class="btn-loader" style="display: none;">
            <div class="loading-spinner"></div>
          </span>
        </button>
      </form>
    `;
  },

  getSignupForm: function() {
    return `
      <form id="signupForm" class="auth-form">
        <div class="form-group">
          <label class="form-label">الاسم الكامل</label>
          <input 
            type="text" 
            id="signupName" 
            class="form-input" 
            placeholder="أحمد محمد"
            required
            autocomplete="name"
          >
        </div>

        <div class="form-group">
          <label class="form-label">${window.AppHelpers.t('email')}</label>
          <input 
            type="email" 
            id="signupEmail" 
            class="form-input" 
            placeholder="example@domain.com"
            required
            autocomplete="email"
          >
        </div>

        <div class="form-group">
          <label class="form-label">${window.AppHelpers.t('password')}</label>
          <div class="password-input-wrapper">
            <input 
              type="password" 
              id="signupPassword" 
              class="form-input" 
              placeholder="6 أحرف على الأقل"
              required
              minlength="6"
              autocomplete="new-password"
            >
            <button type="button" class="password-toggle" data-target="signupPassword">
              ${window.AppIcons.get('eye', { size: 20 })}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">تأكيد كلمة المرور</label>
          <div class="password-input-wrapper">
            <input 
              type="password" 
              id="signupPasswordConfirm" 
              class="form-input" 
              placeholder="••••••••"
              required
              autocomplete="new-password"
            >
            <button type="button" class="password-toggle" data-target="signupPasswordConfirm">
              ${window.AppIcons.get('eye', { size: 20 })}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">
          <span class="btn-text">${window.AppHelpers.t('register')}</span>
          <span class="btn-loader" style="display: none;">
            <div class="loading-spinner"></div>
          </span>
        </button>
      </form>
    `;
  },

  getResetForm: function() {
    return `
      <form id="resetForm" class="auth-form">
        <div class="form-group">
          <label class="form-label">${window.AppHelpers.t('email')}</label>
          <input 
            type="email" 
            id="resetEmail" 
            class="form-input" 
            placeholder="example@domain.com"
            required
            autocomplete="email"
          >
        </div>

        <button type="submit" class="btn btn-primary btn-block">
          <span class="btn-text">إرسال رابط الاستعادة</span>
          <span class="btn-loader" style="display: none;">
            <div class="loading-spinner"></div>
          </span>
        </button>
      </form>
    `;
  },

  getUpdatePasswordForm: function() {
    return `
      <form id="updatePasswordForm" class="auth-form">
        <div class="form-group">
          <label class="form-label">كلمة المرور الجديدة</label>
          <div class="password-input-wrapper">
            <input 
              type="password" 
              id="newPassword" 
              class="form-input" 
              placeholder="6 أحرف على الأقل"
              required
              minlength="6"
              autocomplete="new-password"
            >
            <button type="button" class="password-toggle" data-target="newPassword">
              ${window.AppIcons.get('eye', { size: 20 })}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">تأكيد كلمة المرور</label>
          <div class="password-input-wrapper">
            <input 
              type="password" 
              id="newPasswordConfirm" 
              class="form-input" 
              placeholder="••••••••"
              required
              autocomplete="new-password"
            >
            <button type="button" class="password-toggle" data-target="newPasswordConfirm">
              ${window.AppIcons.get('eye', { size: 20 })}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">
          <span class="btn-text">تحديث كلمة المرور</span>
          <span class="btn-loader" style="display: none;">
            <div class="loading-spinner"></div>
          </span>
        </button>
      </form>
    `;
  },

  getFooterHTML: function() {
    switch(this.currentView) {
      case 'login':
        return `
          <p class="auth-footer-text">
            ليس لديك حساب؟ 
            <a href="#" class="auth-link" data-view="signup">إنشاء حساب جديد</a>
          </p>
        `;
      case 'signup':
        return `
          <p class="auth-footer-text">
            لديك حساب بالفعل؟ 
            <a href="#" class="auth-link" data-view="login">تسجيل الدخول</a>
          </p>
        `;
      case 'reset':
      case 'update-password':
        return `
          <p class="auth-footer-text">
            <a href="#" class="auth-link" data-view="login">العودة لتسجيل الدخول</a>
          </p>
        `;
      default:
        return '';
    }
  },

  bindEvents: function() {
    // View switching
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentView = e.target.dataset.view;
        this.render();
      });
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = window.AppConfig.getCurrentTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.AppConfig.setCurrentTheme(newTheme);
      });
    }

    // Language toggle
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        const currentLang = window.AppConfig.getCurrentLanguage();
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        window.AppConfig.setCurrentLanguage(newLang);
        this.render();
      });
    }

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          input.type = input.type === 'password' ? 'text' : 'password';
        }
      });
    });

    // Form submissions
    this.bindFormEvents();
  },

  bindFormEvents: function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
      resetForm.addEventListener('submit', (e) => this.handleReset(e));
    }

    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
      updatePasswordForm.addEventListener('submit', (e) => this.handleUpdatePassword(e));
    }
  },

  setLoading: function(formId, loading) {
    const form = document.getElementById(formId);
    if (!form) return;

    const btn = form.querySelector('button[type="submit"]');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (loading) {
      btn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'flex';
    } else {
      btn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  },

  handleLogin: async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    this.setLoading('loginForm', true);

    try {
      await window.AppAuth.signIn(email, password);
      window.AppHelpers.toast(window.AppHelpers.t('success'), 'success');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.hash = '#dashboard';
      }, 500);
    } catch (err) {
      window.AppHelpers.toast(err.message, 'error');
    } finally {
      this.setLoading('loginForm', false);
    }
  },

  handleSignup: async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    // Validate passwords match
    if (password !== passwordConfirm) {
      window.AppHelpers.toast('كلمتا المرور غير متطابقتين', 'error');
      return;
    }

    this.setLoading('signupForm', true);

    try {
      const result = await window.AppAuth.signUp(email, password, { full_name: name });
      
      if (result.user && !result.user.email_confirmed_at) {
        window.AppHelpers.toast('تم إرسال رابط التأكيد إلى بريدك الإلكتروني', 'success');
        // Stay on login page
        setTimeout(() => {
          this.currentView = 'login';
          this.render();
        }, 2000);
      } else {
        window.AppHelpers.toast(window.AppHelpers.t('success'), 'success');
        setTimeout(() => {
          window.location.hash = '#dashboard';
        }, 500);
      }
    } catch (err) {
      window.AppHelpers.toast(err.message, 'error');
    } finally {
      this.setLoading('signupForm', false);
    }
  },

  handleReset: async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;

    this.setLoading('resetForm', true);

    try {
      await window.AppAuth.resetPassword(email);
      window.AppHelpers.toast('تم إرسال رابط الاستعادة إلى بريدك الإلكتروني', 'success');
      
      setTimeout(() => {
        this.currentView = 'login';
        this.render();
      }, 2000);
    } catch (err) {
      window.AppHelpers.toast(err.message, 'error');
    } finally {
      this.setLoading('resetForm', false);
    }
  },

  handleUpdatePassword: async function(e) {
    e.preventDefault();
    
    const password = document.getElementById('newPassword').value;
    const passwordConfirm = document.getElementById('newPasswordConfirm').value;

    // Validate passwords match
    if (password !== passwordConfirm) {
      window.AppHelpers.toast('كلمتا المرور غير متطابقتين', 'error');
      return;
    }

    this.setLoading('updatePasswordForm', true);

    try {
      await window.AppAuth.updatePassword(password);
      window.AppHelpers.toast('تم تحديث كلمة المرور بنجاح', 'success');
      
      setTimeout(() => {
        window.location.hash = '#dashboard';
      }, 1000);
    } catch (err) {
      window.AppHelpers.toast(err.message, 'error');
    } finally {
      this.setLoading('updatePasswordForm', false);
    }
  }
};
