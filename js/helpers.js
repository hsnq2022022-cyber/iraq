/**
 * ========================================
 * Helpers Module
 * ========================================
 * دوال مساعدة عامة للتطبيق
 */

window.AppHelpers = (function() {
  'use strict';

  const translations = {
    ar: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      warning: 'تحذير',
      info: 'معلومة',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      error_network: 'خطأ في الاتصال بالشبكة',
      error_auth: 'خطأ في المصادقة',
      error_server: 'خطأ في الخادم',
      error_unknown: 'حدث خطأ غير متوقع'
    },
    en: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      error_network: 'Network error',
      error_auth: 'Authentication error',
      error_server: 'Server error',
      error_unknown: 'An unexpected error occurred'
    }
  };

  function t(key, params = {}) {
    const lang = window.AppConfig ? window.AppConfig.getCurrentLanguage() : 'ar';
    let text = translations[lang] && translations[lang][key] 
      ? translations[lang][key] 
      : (translations['ar'][key] || key);
    
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }
    
    return text;
  }

  function esc(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fmtSize(bytes) {
    if (typeof bytes !== 'number' || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    while (bytes >= 1024 && index < units.length - 1) {
      bytes /= 1024;
      index++;
    }
    return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  function toast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.textContent = message;
    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.parentNode.removeChild(toastEl);
        }
      }, 300);
    }, duration);
  }

  function md(mdText) {
    if (typeof mdText !== 'string') return '';
    let html = esc(mdText);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function fmtDate(date, options = {}) {
    const lang = window.AppConfig ? window.AppConfig.getCurrentLanguage() : 'ar';
    const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', mergedOptions).format(dateObj);
    } catch (e) {
      return String(date);
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    t, esc, fmtSize, toast, md,
    debounce, throttle, generateId, fmtDate, sleep
  };
})();
