import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { embedText } from '@/lib/openrouter';

// 语义检索：根据查询语句 -> embedding -> 向量相似度匹配
// 这里假设你在 Supabase 中为 notes 表 + pgvector 创建了一个 match_notes 函数
// 参考官方文档：https://supabase.com/docs/guides/ai
//
// create or replace function match_notes(
//   query_embedding vector(1536),
//   match_threshold float,
//   match_count int
// )
// returns table (
//   id uuid,
//   content text,
//   category text,
//   tags text[],
//   summary text,
//   mental_model text,
//   created_at timestamptz,
//   similarity float
// )
// language plpgsql
// as $$
// begin
//   return query
//   select
//     n.id,
//     n.content,
//     n.category,
//     n.tags,
//     n.summary,
//     n.mental_model,
//     n.created_at,
//     1 - (n.embedding <=> query_embedding) as similarity
//   from notes n
//   where 1 - (n.embedding <=> query_embedding) > match_threshold
//   order by n.embedding <=> query_embedding
//   limit match_count;
// end;
// $$;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const mode = searchParams.get('mode') ?? 'hybrid';

    if (!query.trim()) {
      return NextResponse.json({ notes: [] });
    }

    // 精准标签搜索：确定性过滤
    if (mode === 'tag') {
      const tag = query.trim();
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
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

      // 回退策略：使用内容和摘要的模糊匹配，避免整个搜索失败
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
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

