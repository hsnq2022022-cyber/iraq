/**
 * ========================================
 * Configuration Module
 * ========================================
 * إعدادات التطبيق العامة ومفاتيح Supabase
 */

window.AppConfig = (function() {
  'use strict';

  const SUPABASE_CONFIG = {
    url: 'https://mlbofdtmxjxjnjdwivqo.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYm9mZHRteGp4am5qZHdpdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTI0MTcsImV4cCI6MjEwMjU2ODQxN30.EJ49q1zSEvlRnus0tHIKK4bdpVp_XRgORB5Iif2v-XY'
  };

  const APP_SETTINGS = {
    name: 'إدارة سوشيال',
    nameEn: 'Social Management',
    version: '1.0.0',
    defaultLanguage: 'ar',
    supportedLanguages: ['ar', 'en'],
    defaultTheme: 'light',
    supportedThemes: ['light', 'dark']
  };

  const API_CONFIG = {
    timeout: 30000,
    maxRetries: 3
  };

  const FEATURES = {
    demoMode: false,
    enableAnalytics: true,
    enableRealtime: true
  };

  return {
    supabase: Object.freeze(SUPABASE_CONFIG),
    app: Object.freeze(APP_SETTINGS),
    api: Object.freeze(API_CONFIG),
    features: Object.freeze(FEATURES),
    
    getCurrentLanguage: function() {
      return localStorage.getItem('app_language') || APP_SETTINGS.defaultLanguage;
    },
    
    setCurrentLanguage: function(lang) {
      if (APP_SETTINGS.supportedLanguages.includes(lang)) {
        localStorage.setItem('app_language', lang);
        return true;
      }
      return false;
    },
    
    getCurrentTheme: function() {
      return localStorage.getItem('app_theme') || APP_SETTINGS.defaultTheme;
    },
    
    setCurrentTheme: function(theme) {
      if (APP_SETTINGS.supportedThemes.includes(theme)) {
        localStorage.setItem('app_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        return true;
      }
      return false;
    }
  };
})();

// Initialize theme on load
(function() {
  const theme = window.AppConfig.getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);
})();
