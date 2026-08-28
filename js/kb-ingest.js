/**
 * ========================================
 * Knowledge Base Ingestion Module
 * ========================================
 * استخراج النصوص من الملفات والروابط + التقطيع
 */

window.AppKBIngest = (function() {
  'use strict';

  // إعدادات التقطيع
  const CHUNK_SIZE = 1000; // عدد الأحرف في كل قطعة
  const CHUNK_OVERLAP = 200; // التداخل بين القطع

  /**
   * استخراج النص من ملف حسب النوع
   * @param {File} file - الملف المراد معالجته
   * @returns {Promise<string>} - النص المستخرج
   */
  async function extractTextFromFile(file) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
      // PDF
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await extractFromPDF(file);
      }

      // Word (docx)
      if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          fileName.endsWith('.docx')) {
        return await extractFromDOCX(file);
      }

      // Excel (xlsx)
      if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          fileName.endsWith('.xlsx')) {
        return await extractFromXLSX(file);
      }

      // Text files
      if (fileType.startsWith('text/') || 
          fileName.endsWith('.txt') || 
          fileName.endsWith('.md')) {
        return await file.text();
      }

      throw new Error(`نوع الملف غير مدعوم: ${fileType || fileName}`);
    } catch (err) {
      console.error('Text extraction error:', err);
      throw err;
    }
  }

  /**
   * استخراج النص من PDF
   */
  async function extractFromPDF(file) {
    // تحميل pdf.js ديناميكيًا
    if (!window.pdfjsLib) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += `\n\n--- صفحة ${i} ---\n${pageText}`;
    }

    return text.trim();
  }

  /**
   * استخراج النص من DOCX
   */
  async function extractFromDOCX(file) {
    if (!window.mammoth) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  /**
   * استخراج النص من XLSX
   */
  async function extractFromXLSX(file) {
    if (!window.XLSX) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
    
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = window.XLSX.utils.sheet_to_csv(sheet);
      text += `\n\n--- ورقة: ${sheetName} ---\n${csv}`;
    });

    return text.trim();
  }

  /**
   * تحميل سكريبت ديناميكيًا
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`فشل تحميل: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * تقطيع النص إلى قطع
   * @param {string} text - النص المراد تقطيعه
   * @param {object} options - خيارات التقطيع
   * @returns {Array} - قائمة القطع
   */
  function chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || CHUNK_SIZE;
    const chunkOverlap = options.chunkOverlap || CHUNK_OVERLAP;
    
    const chunks = [];
    const sentences = text.split(/(?<=[.!?؟।])\s+/);
    
    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength > chunkSize && currentChunk.length > 0) {
        // حفظ القطعة الحالية
        chunks.push({
          content: currentChunk.trim(),
          index: chunks.length
        });

        // بدء قطعة جديدة مع التداخل
        const overlapText = currentChunk.slice(-chunkOverlap);
        currentChunk = overlapText + ' ' + sentence;
        currentLength = overlapText.length + sentenceLength;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentLength += sentenceLength;
      }
    }

    // إضافة آخر قطعة
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunks.length
      });
    }

    return chunks;
  }

  /**
   * معالجة ملف كامل: استخراج + تقطيع + إرسال للـ Edge Function
   * @param {File} file - الملف
   * @param {string} docId - معرف المستند
   * @param {string} agentId - معرف الوكيل
   * @returns {Promise<object>} - نتيجة المعالجة
   */
  async function processFile(file, docId, agentId) {
    try {
      // 1. استخراج النص
      const text = await extractTextFromFile(file);
      
      if (!text || text.trim().length === 0) {
        throw new Error('لم يتم العثور على نص في الملف');
      }

      // 2. تحديث حالة المستند
      await updateDocStatus(docId, 'processing');

      // 3. إرسال للـ Edge Function للتقطيع وتوليد الـ Embeddings
      const result = await window.AppAI.processDocument(docId, text, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        agentId: agentId
      });

      // 4. تحديث حالة المستند
      await updateDocStatus(docId, 'ready', result.chunksCreated);

      return {
        success: true,
        text: text,
        chunks: result.chunksCreated,
        ...result
      };
    } catch (err) {
      await updateDocStatus(docId, 'failed', 0, err.message);
      throw err;
    }
  }

  /**
   * معالجة رابط: زحف + استخراج + تقطيع
   * @param {string} url - الرابط
   * @param {string} docId - معرف المستند
   * @param {string} agentId - معرف الوكيل
   * @returns {Promise<object>} - نتيجة المعالجة
   */
  async function processUrl(url, docId, agentId) {
    try {
      // 1. تحديث حالة المستند
      await updateDocStatus(docId, 'processing');

      // 2. زحف الرابط عبر الـ Edge Function
      const crawlResult = await window.AppAI.crawlUrl(url, docId);
      
      if (!crawlResult.content || crawlResult.content.trim().length === 0) {
        throw new Error('لم يتم العثور على محتوى في الرابط');
      }

      // 3. تحديث حالة المستند
      await updateDocStatus(docId, 'ready', crawlResult.chunksCreated);

      return {
        success: true,
        content: crawlResult.content,
        title: crawlResult.title,
        chunks: crawlResult.chunksCreated,
        ...crawlResult
      };
    } catch (err) {
      await updateDocStatus(docId, 'failed', 0, err.message);
      throw err;
    }
  }

  /**
   * معالجة نص مباشر
   * @param {string} text - النص
   * @param {string} docId - معرف المستند
   * @param {string} agentId - معرف الوكيل
   * @returns {Promise<object>} - نتيجة المعالجة
   */
  async function processText(text, docId, agentId) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('النص فارغ');
      }

      // 1. تحديث حالة المستند
      await updateDocStatus(docId, 'processing');

      // 2. إرسال للـ Edge Function
      const result = await window.AppAI.processDocument(docId, text, {
        fileName: 'نص مباشر',
        agentId: agentId
      });

      // 3. تحديث حالة المستند
      await updateDocStatus(docId, 'ready', result.chunksCreated);

      return {
        success: true,
        chunks: result.chunksCreated,
        ...result
      };
    } catch (err) {
      await updateDocStatus(docId, 'failed', 0, err.message);
      throw err;
    }
  }

  /**
   * تحديث حالة المستند في قاعدة البيانات
   */
  async function updateDocStatus(docId, status, chunkCount = 0, errorMessage = null) {
    const client = window.AppAuth ? window.AppAuth.getClient() : null;
    if (!client) return;

    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (chunkCount > 0) {
      updateData.chunk_count = chunkCount;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    try {
      await client
        .from('knowledge_docs')
        .update(updateData)
        .eq('id', docId);
    } catch (err) {
      console.error('Failed to update doc status:', err);
    }
  }

  return {
    extractTextFromFile,
    chunkText,
    processFile,
    processUrl,
    processText
  };
})();
