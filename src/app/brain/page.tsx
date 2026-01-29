'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Brain, Search } from 'lucide-react';
import {
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/stagger-list';
import { NoteCard, type Note } from '@/components/note-card';

const CORE_MENTAL_MODELS = [
  '基本事实',
  '精神熵',
  '认知重构',
  '杠杆效应',
  '关键动能',
  '一人公司',
] as const;

export default function BrainPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始加载：拉取更多历史记录（知识整理页用）
  useEffect(() => {
    const loadAllNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const res = await fetch('/api/notes?limit=400');
        const data = await res.json();

        if (!res.ok) {
          console.error('Failed to load notes for brain page:', data.error);
          setError(data.error || '加载笔记失败');
          return;
        }

        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
        }
      } catch (e: any) {
        console.error('Error loading notes for brain page:', e);
        setError(e.message ?? '加载笔记失败');
      } finally {
        setIsLoadingNotes(false);
      }
    };

    loadAllNotes();
  }, []);

  const listToRender =
    searchQuery.trim().length > 0 ? searchResults : notes;

  const runSearch = async (q: string, mode?: 'hybrid' | 'tag') => {
    const query = q.trim();
    if (!query) {
      setSearchResults([]);
      setActiveModel(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: query });
      if (mode) params.set('mode', mode);
      const res = await fetch(`/api/notes/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search notes');
      }

      if (Array.isArray(data.notes)) {
        setSearchResults(data.notes);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? '搜索失败');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActiveModel(null);
    await runSearch(searchQuery, 'hybrid');
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-20 space-y-8">
        {/* 顶部：标题 + 返回入口 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center shadow-[0_0_24px_rgba(15,23,42,0.7)]">
              <Brain className="h-5 w-5 text-neutral-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium tracking-[0.18em] uppercase text-neutral-400">
                Second Brain
              </span>
              <span className="text-xs text-neutral-500">
                知识整理中心 · Entropy Reduction Console
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="text-[11px] text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            ← 返回捕获页
          </Link>
        </div>

        {/* 搜索 + 核心思维模型胶囊栏 */}
        <section className="space-y-3">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="在整个第二大脑中进行语义检索…"
                className="w-full rounded-full bg-neutral-950/80 border border-neutral-800 px-9 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-0 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-full border border-neutral-800 text-[11px] text-neutral-300 hover:bg-neutral-900 transition-colors"
              disabled={isSearching}
            >
              {isSearching ? '检索中…' : '搜索'}
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveModel(null);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className={`shrink-0 text-[10px] px-3 py-1 rounded-full border transition-colors ${
                activeModel === null && !searchQuery.trim()
                  ? 'bg-neutral-100 text-black border-neutral-300'
                  : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'
              }`}
            >
              全部
            </button>
            {CORE_MENTAL_MODELS.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => {
                  setActiveModel(model);
                  setSearchQuery(model);
                  // 使用和输入框一致的 Hybrid Search，保证有结果
                  runSearch(model, 'hybrid');
                }}
                className={`shrink-0 text-[10px] px-3 py-1 rounded-full border transition-colors ${
                  activeModel === model
                    ? 'bg-neutral-100 text-black border-neutral-300'
                    : 'border-neutral-700 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                {model}
              </button>
            ))}
          </div>
        </section>

        {/* 列表 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>
              {searchQuery.trim()
                ? '搜索结果'
                : '全部内化记录'}
            </span>
            <span>
              {isLoadingNotes
                ? '加载中…'
                : `共 ${listToRender.length} 条`}
            </span>
          </div>

          {error && (
            <p className="text-[11px] text-red-400">
              {error}
            </p>
          )}

          {isLoadingNotes && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative h-5 w-5">
                <div className="absolute inset-0 rounded-full bg-neutral-200/30 animate-ping" />
                <div className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-neutral-200/70 animate-pulse" />
              </div>
              <div className="text-[11px] tracking-[0.18em] text-neutral-500/80 animate-pulse">
                Syncing Second Brain...
              </div>
            </div>
          )}

          {!isLoadingNotes && listToRender.length === 0 && (
            <p className="text-xs text-neutral-600">
              还没有任何笔记，或当前条件下没有匹配结果。
            </p>
          )}

          {!isLoadingNotes && listToRender.length > 0 && (
            <StaggerContainer className="space-y-2">
              {listToRender.map((note) => (
                <StaggerItem key={note.id}>
                  <NoteCard note={note} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>
      </main>
    </div>
  );
}

