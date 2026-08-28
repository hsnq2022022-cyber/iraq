// ========================================
// Verify Widget Edge Function
// التحقق من توكن الويدجت قبل الرد
// ========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { token, origin } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'Token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find widget by token
    const { data: widget, error } = await supabase
      .from('widgets')
      .select('*, agents(*)')
      .eq('token', token)
      .eq('is_enabled', true)
      .single();

    if (error || !widget) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check origin if allowed_origins is set
    if (widget.allowed_origins && widget.allowed_origins.length > 0 && origin) {
      const allowed = widget.allowed_origins.some((allowedOrigin: string) => {
        if (allowedOrigin === '*') return true;
        return origin.startsWith(allowedOrigin) || allowedOrigin === origin;
      });

      if (!allowed) {
        return new Response(JSON.stringify({ valid: false, error: 'Origin not allowed' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      valid: true,
      widget: {
        id: widget.id,
        name: widget.name,
        theme: widget.theme,
        agent: widget.agents
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ valid: false, error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
