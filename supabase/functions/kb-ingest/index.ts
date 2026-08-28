// ========================================
// KB Ingest Edge Function
// توليد Embeddings وحفظها في knowledge_chunks
// ========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { docId, content, metadata } = await req.json();

    if (!docId || !content) {
      return new Response(JSON.stringify({ error: 'docId and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Chunk the content
    const chunks = chunkText(content, 1000, 200);

    // Generate embeddings for all chunks
    const chunksWithEmbeddings: Array<{
      doc_id: string;
      workspace_id: string;
      chunk_index: number;
      content: string;
      embedding: number[];
      metadata: any;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk);
      
      if (embedding) {
        chunksWithEmbeddings.push({
          doc_id: docId,
          workspace_id: doc.workspace_id,
          chunk_index: i,
          content: chunk,
          embedding: embedding,
          metadata: metadata || {}
        });
      }
    }

    // Delete existing chunks for this doc
    await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('doc_id', docId);

    // Insert new chunks
    if (chunksWithEmbeddings.length > 0) {
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert(chunksWithEmbeddings);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      chunksCreated: chunksWithEmbeddings.length,
      totalChunks: chunks.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('KB Ingest error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * تقطيع النص
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?؟।])\s+/);
  
  let currentChunk = '';
  let currentLength = 0;

  for (const sentence of sentences) {
    if (currentLength + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + sentence;
      currentLength = overlapText.length + sentence.length;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentLength += sentence.length;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * توليد Embedding
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          content: { parts: [{ text: text }] }
        })
      }
    );

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error('Embedding error:', err);
    return null;
  }
}
