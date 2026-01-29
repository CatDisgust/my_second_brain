import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type TagCount = {
  tag: string;
  count: number;
};

// 统计所有出现过的 tags，去重并按数量排序
export async function GET() {
  try {
    // 简单实现：拉取 tags 字段后在服务端聚合（适合个人/小团队规模）
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('tags')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase load tags error:', error);
      return NextResponse.json(
        { error: 'Failed to load tags' },
        { status: 500 },
      );
    }

    const counter = new Map<string, number>();
    for (const row of data ?? []) {
      const tags = (row as any).tags as string[] | null;
      if (!tags || !Array.isArray(tags)) continue;
      for (const t of tags) {
        const tag = String(t).trim();
        if (!tag) continue;
        counter.set(tag, (counter.get(tag) ?? 0) + 1);
      }
    }

    const tags: TagCount[] = Array.from(counter.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

