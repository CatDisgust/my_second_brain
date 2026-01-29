import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { embedText } from '@/lib/openrouter';

// 语义检索：仅检索当前登录用户的笔记

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ notes: [], error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const mode = searchParams.get('mode') ?? 'hybrid';

    if (!query.trim()) {
      return NextResponse.json({ notes: [] });
    }

    // 精准标签搜索：仅当前用户
    if (mode === 'tag') {
      const tag = query.trim();
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .contains('tags', [tag])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase tag search error:', error);
        return NextResponse.json(
          { error: 'Failed to search notes' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        notes: (data ?? []).map((n: any) => ({ ...n, similarity: 1.0 })),
      });
    }

    try {
      // 1) embedding
      const queryEmbedding = await embedText(query);

      // 2) 混合检索：标签完全匹配 -> similarity=1.0；否则使用向量距离
      // 需要你在 Supabase 中把 match_notes 升级为带 query_text 参数的版本（我会提供 SQL）
      const { data, error } = await supabaseAdmin.rpc('match_notes', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: 10,
        p_user_id: user.id,
      });

      if (error) {
        console.error('Supabase match_notes error:', error);
        throw error;
      }

      return NextResponse.json({ notes: data ?? [] });
    } catch (vectorError) {
      console.error(
        'Vector search failed, falling back to keyword search:',
        vectorError,
      );

      // 回退策略：仅当前用户，内容和摘要模糊匹配
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .or(
          `content.ilike.%${query}%,summary.ilike.%${query}%,mental_model.ilike.%${query}%`,
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase fallback search error:', error);
        return NextResponse.json(
          { error: 'Failed to search notes' },
          { status: 500 },
        );
      }

      return NextResponse.json({ notes: data ?? [] });
    }
  } catch (error) {
    console.error('GET /api/notes/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

