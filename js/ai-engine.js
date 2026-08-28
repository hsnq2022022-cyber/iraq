/**
 * ========================================
 * AI Engine Module
 * ========================================
 * الاتصال بـ Gemini API عبر Edge Functions
 */

window.AppAI = (function() {
  'use strict';

  let supabaseClient = null;

  function init() {
    if (!window.AppAuth) {
      console.error('AppAuth not initialized');
      return null;
    }
    supabaseClient = window.AppAuth.getClient ? window.AppAuth.getClient() : null;
    return supabaseClient;
  }

  function getClient() {
    if (!supabaseClient) {
      init();
    }
    return supabaseClient;
  }

  /**
   * إرسال رسالة إلى الذكاء الاصطناعي
   * @param {string} agentId - معرف الوكيل
   * @param {string} conversationId - معرف المحادثة
   * @param {string} message - رسالة المستخدم
   * @param {object} options - خيارات إضافية
   * @returns {Promise<object>} - رد الذكاء الاصطناعي
   */
  async function askAI(agentId, conversationId, message, options = {}) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.functions.invoke('ai-respond', {
        body: {
          agentId: agentId,
          conversationId: conversationId,
          message: message,
          ...options
        }
      });

      if (error) {
        throw new Error(getAIErrorMessage(error));
      }

      return {
        success: true,
        response: data.response,
        model: data.model,
        sources: data.sources || [],
        tokens: data.tokens || {}
      };
    } catch (err) {
      console.error('AI Engine error:', err);
      throw err;
    }
  }

  /**
   * البحث في قاعدة المعرفة
   * @param {string} agentId - معرف الوكيل
   * @param {string} query - نص البحث
   * @param {number} limit - عدد النتائج
   * @returns {Promise<Array>} - نتائج البحث
   */
  async function searchKnowledge(agentId, query, limit = 5) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.functions.invoke('ai-respond', {
        body: {
          agentId: agentId,
          query: query,
          searchOnly: true,
          limit: limit
        }
      });

      if (error) {
        throw new Error(getAIErrorMessage(error));
      }

      return {
        success: true,
        results: data.results || []
      };
    } catch (err) {
      console.error('Knowledge search error:', err);
      throw err;
    }
  }

  /**
   * معالجة مستند وإضافته لقاعدة المعرفة
   * @param {string} docId - معرف المستند
   * @param {string} content - محتوى المستند
   * @param {object} metadata - بيانات وصفية
   * @returns {Promise<object>} - نتيجة المعالجة
   */
  async function processDocument(docId, content, metadata = {}) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.functions.invoke('kb-ingest', {
        body: {
          docId: docId,
          content: content,
          metadata: metadata
        }
      });

      if (error) {
        throw new Error(getAIErrorMessage(error));
      }

      return {
        success: true,
        chunksCreated: data.chunksCreated || 0,
        ...data
      };
    } catch (err) {
      console.error('Document processing error:', err);
      throw err;
    }
  }

  /**
   * زحف رابط واستخراج محتواه
   * @param {string} url - الرابط المراد زحفه
   * @param {string} docId - معرف المستند
   * @returns {Promise<object>} - نتيجة الزحف
   */
  async function crawlUrl(url, docId) {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await client.functions.invoke('kb-crawl', {
        body: {
          url: url,
          docId: docId
        }
      });

      if (error) {
        throw new Error(getAIErrorMessage(error));
      }

      return {
        success: true,
        content: data.content || '',
        title: data.title || '',
        ...data
      };
    } catch (err) {
      console.error('URL crawl error:', err);
      throw err;
    }
  }

  function getAIErrorMessage(error) {
    const lang = window.AppConfig ? window.AppConfig.getCurrentLanguage() : 'ar';
    
    const errorMessages = {
      ar: {
        'rate_limit': 'تم تجاوز حد الطلبات، حاول لاحقًا',
        'api_error': 'خطأ في خدمة الذكاء الاصطناعي',
        'context_length': 'النص طويل جدًا، قم بتقليله',
        'invalid_key': 'مفتاح API غير صحيح',
        'network': 'خطأ في الاتصال بالشبكة',
        'default': 'حدث خطأ غير متوقع'
      },
      en: {
        'rate_limit': 'Rate limit exceeded, try again later',
        'api_error': 'AI service error',
        'context_length': 'Text too long, please reduce it',
        'invalid_key': 'Invalid API key',
        'network': 'Network error',
        'default': 'An unexpected error occurred'
      }
    };

    const messages = errorMessages[lang] || errorMessages['ar'];
    const message = error.message || '';
    
    if (message.includes('rate limit') || message.includes('429')) {
      return messages['rate_limit'];
    }
    if (message.includes('context length') || message.includes('too long')) {
      return messages['context_length'];
    }
    if (message.includes('API key') || message.includes('401')) {
      return messages['invalid_key'];
    }
    if (message.includes('network') || message.includes('fetch')) {
      return messages['network'];
    }
    
    return messages['api_error'];
  }

  return {
    init,
    getClient,
    askAI,
    searchKnowledge,
    processDocument,
    crawlUrl,
    getAIErrorMessage
  };
})();
