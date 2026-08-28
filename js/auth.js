/**
 * ========================================
 * Authentication Module
 * ========================================
 * نظام المصادقة الحقيقي عبر Supabase Auth
 */

window.AppAuth = (function() {
  'use strict';

  let supabaseClient = null;
  let authStateCallbacks = [];

  function init() {
    if (!window.supabase) {
      console.error('Supabase SDK not loaded');
      return null;
    }

    supabaseClient = window.supabase.createClient(
      window.AppConfig.supabase.url,
      window.AppConfig.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );

    // Monitor auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      authStateCallbacks.forEach(callback => {
        try {
          callback(event, session);
        } catch (e) {
          console.error('Auth callback error:', e);
        }
      });
    });

    return supabaseClient;
  }

  function getClient() {
    if (!supabaseClient) {
      init();
    }
    return supabaseClient;
  }

  async function signUp(email, password, metadata = {}) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: metadata
        }
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    }
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  }

  async function signInWithMagicLink(email) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true };
    } catch (err) {
      console.error('Magic link error:', err);
      throw err;
    }
  }

  async function signInWithOAuth(provider) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin + '/#dashboard'
        }
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true, url: data.url };
    } catch (err) {
      console.error('OAuth error:', err);
      throw err;
    }
  }

  async function signOut() {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true };
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  }

  async function resetPassword(email) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: window.location.origin + '/#reset-password'
        }
      );

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true };
    } catch (err) {
      console.error('Reset password error:', err);
      throw err;
    }
  }

  async function updatePassword(newPassword) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Update password error:', err);
      throw err;
    }
  }

  async function getCurrentUser() {
    const client = getClient();
    if (!client) {
      return null;
    }

    try {
      const { data: { user }, error } = await client.auth.getUser();

      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      return user;
    } catch (err) {
      console.error('Get user error:', err);
      return null;
    }
  }

  async function getSession() {
    const client = getClient();
    if (!client) {
      return null;
    }

    try {
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        console.error('Get session error:', error);
        return null;
      }

      return session;
    } catch (err) {
      console.error('Get session error:', err);
      return null;
    }
  }

  function onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      authStateCallbacks.push(callback);
    }
  }

  function removeAuthListener(callback) {
    authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
  }

  function getAuthErrorMessage(error) {
    const lang = window.AppConfig ? window.AppConfig.getCurrentLanguage() : 'ar';
    
    const errorMessages = {
      ar: {
        'Invalid login credentials': 'بيانات الدخول غير صحيحة',
        'Email not confirmed': 'البريد الإلكتروني غير مؤكد',
        'User already registered': 'المستخدم مسجل بالفعل',
        'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        'Invalid email': 'البريد الإلكتروني غير صحيح',
        'Too many requests': 'محاولات كثيرة، حاول لاحقًا',
        'Network error': 'خطأ في الاتصال بالشبكة',
        'default': 'حدث خطأ غير متوقع'
      },
      en: {
        'Invalid login credentials': 'Invalid login credentials',
        'Email not confirmed': 'Email not confirmed',
        'User already registered': 'User already registered',
        'Password should be at least 6 characters': 'Password should be at least 6 characters',
        'Invalid email': 'Invalid email',
        'Too many requests': 'Too many requests, try later',
        'Network error': 'Network error',
        'default': 'An unexpected error occurred'
      }
    };

    const messages = errorMessages[lang] || errorMessages['ar'];
    const message = error.message || error.msg || '';
    
    return messages[message] || messages['default'];
  }

  async function verifyEmailOtp(tokenHash) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email'
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }

      return { success: true, session: data.session };
    } catch (err) {
      console.error('Verify OTP error:', err);
      throw err;
    }
  }

  return {
    init,
    getClient,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    getCurrentUser,
    getSession,
    onAuthStateChange,
    removeAuthListener,
    verifyEmailOtp,
    getAuthErrorMessage
  };
})();

// Auto-initialize on load
window.AppAuth.init();
