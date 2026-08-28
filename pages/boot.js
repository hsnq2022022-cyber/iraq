/**
 * ========================================
 * Boot
 * ========================================
 */

document.addEventListener('DOMContentLoaded', function() {
  // تطبيق اللغة والاتجاه
  const lang = window.AppConfig.getCurrentLanguage();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // تطبيق الثيم المحفوظ
  const theme = window.AppConfig.getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);

  // تهيئة محرك الذكاء بعد توفر Auth
  if (window.AppAI && window.AppAI.init) {
    window.AppAI.init();
  }

  // بدء التوجيه
  window.Router.init();
});
