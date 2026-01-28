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

    if (!query.trim()) {
      return NextResponse.json({ notes: [] });
    }

    // 1. 将查询语句转为 embedding
    const queryEmbedding = await embedText(query);

    // 2. 调用数据库侧的相似度检索函数
    const { data, error } = await supabaseAdmin.rpc('match_notes', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6, // 越高越严格
      match_count: 10,
    });

    if (error) {
      console.error('Supabase match_notes error:', error);
      return NextResponse.json(
        { error: 'Failed to search notes' },
        { status: 500 },
      );
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    console.error('GET /api/notes/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

