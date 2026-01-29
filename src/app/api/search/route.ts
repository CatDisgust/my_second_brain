import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/utils/supabase/server';

// In this project, OPENAI_API_KEY can be an OpenRouter key (sk-or-v1...).
// We also support OPENROUTER_API_KEY for compatibility.
const OPENROUTER_KEY =
  process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY;
// OpenRouter embeddings often require a provider-prefixed model id.
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
// Prefer your own OpenRouter proxy (if configured), else talk to OpenRouter directly.
const OPENROUTER_BASE_URL =
  process.env.NEXT_PUBLIC_OPENROUTER_PROXY_URL ?? 'https://openrouter.ai/api/v1';
const OPENROUTER_HTTP_REFERER =
  process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost:3000';
const OPENROUTER_X_TITLE = 'Second Brain App';

export type SearchRequestBody = {
  query: string;
  userId?: string;
};

export type SearchResponse =
  | { notes: Array<Record<string, unknown> & { similarity?: number }> }
  | { error: string };

/**
 * POST /api/search
 * Hybrid search: generate embedding with OpenAI, then call Supabase match_notes RPC.
 * Accepts query (required) and optional userId; if userId omitted, uses authenticated user from session.
 */
export async function POST(request: Request): Promise<NextResponse<SearchResponse>> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:23',message:'POST /api/search entry',data:{hasOpenRouterKey:!!OPENROUTER_KEY,openRouterKeyLength:OPENROUTER_KEY?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const body = (await request.json()) as SearchRequestBody;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:26',message:'Request body parsed',data:{hasQuery:!!body?.query,queryLength:body?.query?.length||0,hasUserId:!!body?.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const bodyUserId = typeof body?.userId === 'string' ? body.userId : undefined;

    if (!query) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:32',message:'Query validation failed',data:{query},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Missing or invalid query' },
        { status: 400 },
      );
    }

    // Prefer authenticated user; fall back to body userId for server-to-server or testing
    let userId = bodyUserId;
    if (!userId) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:40',message:'Getting user from session',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:46',message:'Auth result',data:{hasUser:!!user,hasAuthError:!!authError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (authError || !user) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:48',message:'Auth failed, returning 401',data:{authError:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return NextResponse.json(
          { error: '请先登录' },
          { status: 401 },
        );
      }
      userId = user.id;
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:54',message:'Checking OpenRouter key before embedding',data:{hasOpenRouterKey:!!OPENROUTER_KEY,openRouterKeyLength:OPENROUTER_KEY?.length||0,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!OPENROUTER_KEY) {
      console.error('OpenRouter key is not set (OPENAI_API_KEY or OPENROUTER_API_KEY)');
      return NextResponse.json(
        { error: 'Search service misconfigured' },
        { status: 500 },
      );
    }

    let queryEmbedding: number[];
    try {
      console.log('[api/search] calling OpenRouter embedding', {
        baseURL: OPENROUTER_BASE_URL,
        model: EMBEDDING_MODEL,
        queryLength: query.length,
      });

      const openai = new OpenAI({
        apiKey: OPENROUTER_KEY,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
          'HTTP-Referer': OPENROUTER_HTTP_REFERER,
          'X-Title': OPENROUTER_X_TITLE,
        },
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:65',message:'Calling OpenRouter embeddings.create',data:{baseURL:OPENROUTER_BASE_URL,model:EMBEDDING_MODEL,queryLength:query.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
      });

      const errorPayload = (embeddingResponse as any)?.error;
      if (errorPayload) {
        console.log('[api/search] openrouter error payload', errorPayload);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:embeddings.error',message:'Embedding response contained error payload',data:{errorMessage:errorPayload?.message,errorCode:errorPayload?.code,errorType:errorPayload?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        throw new Error(errorPayload?.message ?? 'OpenRouter embedding error');
      }

      const embedding = embeddingResponse.data?.[0]?.embedding;
      console.log('[api/search] embedding response shape', {
        topLevelKeys: Object.keys(embeddingResponse as any),
        dataLength: Array.isArray((embeddingResponse as any).data)
          ? (embeddingResponse as any).data.length
          : 0,
        firstItemKeys:
          (embeddingResponse as any).data && (embeddingResponse as any).data[0]
            ? Object.keys((embeddingResponse as any).data[0])
            : [],
      });
      console.log('[api/search] embedding received', {
        embeddingLength: Array.isArray(embedding) ? embedding.length : 0,
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:71',message:'Embedding response received',data:{hasData:!!embeddingResponse.data,dataLength:embeddingResponse.data?.length||0,hasEmbedding:!!embedding,embeddingLength:Array.isArray(embedding)?embedding.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenRouter');
      }
      queryEmbedding = embedding as number[];
    } catch (embedError) {
      console.error('[api/search] embedding error (full):', embedError);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:77',message:'OpenAI embedding error caught',data:{errorMessage:embedError instanceof Error?embedError.message:String(embedError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: embedError instanceof Error ? embedError.message : 'Failed to generate search embedding' },
        { status: 502 },
      );
    }

    // With small personal datasets, tune threshold conservatively.
    const matchThreshold = 0.3;
    const matchCount = 50;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:87',message:'Calling Supabase match_notes RPC',data:{queryLength:query.length,embeddingLength:queryEmbedding.length,userId,matchThreshold,matchCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const { data, error } = await supabaseAdmin.rpc('match_notes', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_user_id: userId,
    });

    console.log('[api/search] supabase match_notes result', {
      hasError: !!error,
      dataIsArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : 0,
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:95',message:'Supabase RPC result',data:{hasError:!!error,errorMessage:error?.message,hasData:!!data,dataIsArray:Array.isArray(data),dataLength:Array.isArray(data)?data.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (error) {
      console.error('[api/search] Supabase match_notes error (full):', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 },
      );
    }

    // Additional runtime evidence: how many notes does this user have?
    try {
      const { count } = await supabaseAdmin
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      console.log('[api/search] notes count for user', { userId, count });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:userNotesCount',message:'User notes count',data:{count:count??null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      console.log('[api/search] notes count check failed', e);
    }

    let notes = Array.isArray(data) ? data : [];

    // Robust fallback: if hybrid/vector returns nothing, fall back to keyword search.
    if (notes.length === 0) {
      console.log('[api/search] match_notes returned empty, using keyword fallback');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:fallback',message:'Fallback keyword search triggered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .or(
          `content.ilike.%${query}%,summary.ilike.%${query}%,mental_model.ilike.%${query}%`,
        )
        .order('created_at', { ascending: false })
        .limit(matchCount);

      if (fallbackError) {
        console.error('[api/search] fallback search error (full):', fallbackError);
      } else if (Array.isArray(fallbackData)) {
        notes = fallbackData;
      }
      console.log('[api/search] fallback result', {
        dataIsArray: Array.isArray(fallbackData),
        dataLength: Array.isArray(fallbackData) ? fallbackData.length : 0,
      });
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/search/route.ts:103',message:'Returning search results',data:{notesCount:notes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ notes });
  } catch (err) {
    console.error('POST /api/search error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
