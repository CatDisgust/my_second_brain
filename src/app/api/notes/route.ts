import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { analyzeNote, embedText } from '@/lib/openrouter';

// 创建新笔记（内化）
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 },
      );
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing content' },
        { status: 400 },
      );
    }

    let analysis: Awaited<ReturnType<typeof analyzeNote>>;
    try {
      analysis = await analyzeNote(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI 分析失败';
      console.error('POST /api/notes analyzeNote:', e);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/notes/route.ts:analyzeNote:catch',message:'analyzeNote threw',data:{errMsg:msg,name:e instanceof Error?e.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    let embedding: number[];
    try {
      embedding = await embedText(`${content}\n\nSummary: ${analysis.summary}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '向量生成失败';
      console.error('POST /api/notes embedText:', e);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        user_id: user.id,
        content,
        category: analysis.category,
        tags: analysis.tags,
        summary: analysis.summary,
        mental_model: analysis.mental_model,
        embedding,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      const msg = error.message || 'Failed to save note';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    const msg =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const ITEMS_PER_PAGE = 10;

// 获取笔记列表
// - ?page=1 分页模式：每页 10 条，返回 notes + totalCount（首页用）
// - ?limit=N 兼容模式：返回最多 N 条，无 totalCount（/brain 等用）
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录', notes: [], totalCount: 0 },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const usePagination = searchParams.has('page') || !searchParams.has('limit');

    if (usePagination) {
      const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : Number.NaN;
      const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabaseAdmin
        .from('notes')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) {
        console.error('Supabase list notes error:', error);
        return NextResponse.json(
          { error: 'Failed to load notes' },
          { status: 500 },
        );
      }
      return NextResponse.json({
        notes: data ?? [],
        totalCount: count ?? 0,
      });
    }

    const parsed = limitParam ? Number.parseInt(limitParam, 10) : Number.NaN;
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 100;

    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase list notes error:', error);
      return NextResponse.json(
        { error: 'Failed to load notes' },
        { status: 500 },
      );
    }
    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// 删除指定笔记（仅允许删除当前用户的笔记）
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase delete note error:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

