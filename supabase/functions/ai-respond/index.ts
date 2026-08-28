// ========================================
// AI Respond Edge Function
// يستدعي Gemini API + RAG Search
// ========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agentId, conversationId, message, query, searchOnly, limit } = await req.json();

    if (!agentId) {
      return new Response(JSON.stringify({ error: 'agentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If search only mode, just return search results
    if (searchOnly && query) {
      const searchResults = await searchKnowledge(supabase, agent.workspace_id, agentId, query, limit || 5);
      return new Response(JSON.stringify({ results: searchResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // RAG: Search knowledge base
    let contextChunks: Array<{ content: string; doc_name: string; similarity: number }> = [];
    if (message) {
      contextChunks = await searchKnowledge(supabase, agent.workspace_id, agentId, message, 5);
    }

    // Build system prompt
    let systemPrompt = agent.system_prompt || 'أنت مساعد ذكي.';
    
    if (contextChunks.length > 0) {
      systemPrompt += '\n\n## قاعدة المعرفة:\nاستخدم المعلومات التالية للإجابة على السؤال:\n';
      contextChunks.forEach((chunk, i) => {
        systemPrompt += `\n[${i + 1}] من "${chunk.doc_name}":\n${chunk.content}\n`;
      });
      systemPrompt += '\n\nإذا كانت المعلومات غير موجودة في قاعدة المعرفة، أخبر المستخدم بذلك.';
    }

    // Get conversation history
    let history: Array<{ role: string; content: string }> = [];
    if (conversationId) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (messages) {
        history = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content
        }));
      }
    }

    // Call Gemini API
    const geminiResponse = await callGemini(systemPrompt, history, message);

    // Save user message
    if (conversationId) {
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          workspace_id: agent.workspace_id,
          role: 'user',
          content: message
        },
        {
          conversation_id: conversationId,
          workspace_id: agent.workspace_id,
          role: 'assistant',
          content: geminiResponse.response,
          model_used: GEMINI_MODEL,
          token_count: geminiResponse.tokens
        }
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      response: geminiResponse.response,
      model: GEMINI_MODEL,
      sources: contextChunks.map(c => ({ doc_name: c.doc_name, similarity: c.similarity })),
      tokens: geminiResponse.tokens
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Respond error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/**
 * البحث في قاعدة المعرفة باستخدام pgvector
 */
async function searchKnowledge(
  supabase: any,
  workspaceId: string,
  agentId: string,
  query: string,
  limit: number = 5
): Promise<Array<{ content: string; doc_name: string; similarity: number }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      return [];
    }

    // Call the match_knowledge_chunks function
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_workspace_id: workspaceId,
      match_agent_id: agentId,
      match_count: limit,
      match_threshold: 0.7
    });

    if (error) {
      console.error('Knowledge search error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

/**
 * توليد Embedding للنص
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`,
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

/**
 * استدعاء Gemini API للمحادثة
 */
async function callGemini(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<{ response: string; tokens: number }> {
  try {
    const contents = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    return { response: responseText, tokens };
  } catch (err) {
    console.error('Gemini API error:', err);
    throw err;
  }
}
