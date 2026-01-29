import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeNote, embedText } from '@/lib/openrouter';

// 创建新笔记（内化）
export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing content' },
        { status: 400 },
      );
    }

    // 1. AI 分析
    const analysis = await analyzeNote(content);

    // 2. 生成向量（可以基于原文 + 总结）
    const embedding = await embedText(`${content}\n\nSummary: ${analysis.summary}`);

    // 3. 写入 Supabase notes 表
    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
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
      return NextResponse.json(
        { error: 'Failed to save note' },
        { status: 500 },
      );
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// 获取笔记列表
// - 默认：返回最近 5 条（用于首页轻量展示）
// - 可通过 ?limit=100 调整数量（用于 /brain 等整理视图）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsed = limitParam ? Number.parseInt(limitParam, 10) : Number.NaN;
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 5;

    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
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

// 删除指定笔记
export async function DELETE(request: Request) {
  try {
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
      .eq('id', id);

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

