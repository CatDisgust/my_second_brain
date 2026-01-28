'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, Sparkles } from 'lucide-react';

type Note = {
  id: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  summary: string | null;
  mental_model: string | null;
  created_at: string;
  similarity?: number;
};

const LOADING_MESSAGES = [
  'AI 正在重构你的思维…',
  '正在建立你的知识索引…',
  '正在寻找跨学科关联…',
  '正在提炼可复制的心智模型…',
  '正在为未来的你缓存这次顿悟…',
];

export default function HomePage() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 自动扩容 textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [content]);

  // 加载最近的 notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const res = await fetch('/api/notes');
        const data = await res.json();
        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadNotes();
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    const randomMsg =
      LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
    setLoadingMessage(randomMsg);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note');
      }

      if (data.note) {
        setNotes((prev) => [data.note, ...prev]);
      }
      setSuccessMessage('✅ 思想已入库');
      // 短暂保留提示，再清空输入
      setTimeout(() => {
        setSuccessMessage(null);
        setContent('');
      }, 1500);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? '未知错误');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: searchQuery });
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

  const listToRender =
    searchQuery.trim().length > 0 ? searchResults : notes;

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col">
      {/* 顶部导航 + 搜索 */}
      <header className="border-b border-neutral-900/80 backdrop-blur-sm sticky top-0 z-20 bg-black/70">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center">
              <Brain className="h-5 w-5 text-neutral-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium tracking-wide text-neutral-200">
                Second Brain
              </span>
              <span className="text-xs text-neutral-500">
                Internalize. Index. Retrieve.
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md hidden md:flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="语义搜索：例如 “关于赚钱的焦虑”"
                className="w-full rounded-full bg-neutral-950/80 border border-neutral-800 px-9 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-0 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-full border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-900 transition-colors"
              disabled={isSearching}
            >
              {isSearching ? '检索中…' : '搜索'}
            </button>
          </form>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 pt-10 pb-16 space-y-10">
          {/* 中央输入卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-neutral-900 bg-gradient-to-b from-neutral-950 to-black/60 px-6 py-5 shadow-[0_0_80px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-neutral-900 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-neutral-200" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-medium tracking-wide text-neutral-300">
                    Capture your current insight
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    一次只记录一个真正重要的想法
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`relative rounded-2xl bg-black/0 transition-all duration-300 ${
                isLoading ? 'backdrop-blur-[2px] bg-black/10' : ''
              }`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你刚刚的顿悟、感想或痛点。比如：我意识到自己在赚钱这件事上总是出于恐惧，而不是创造价值的兴趣……"
                className="w-full resize-none bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none leading-relaxed"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {loadingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                className="mt-3 flex items-center gap-3 text-[11px] text-neutral-500"
              >
                <div className="relative h-[2px] w-20 overflow-hidden rounded-full bg-neutral-900">
                  <motion.div
                    className="h-full w-1/2 rounded-full bg-neutral-300"
                    initial={{ x: '-50%' }}
                    animate={{ x: '150%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
                <motion.span
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'easeInOut',
                  }}
                  className="whitespace-nowrap"
                >
                  {loadingMessage}
                </motion.span>
              </motion.div>
            )}

            {successMessage && !loadingMessage && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="mt-3 text-[11px] text-emerald-400"
              >
                {successMessage}
              </motion.p>
            )}

            {error && (
              <p className="mt-3 text-[11px] text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-600">
                “内化” 会自动解析心智模型，并存入 Second Brain。
              </span>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97, y: 0 }}
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-100 text-black px-4 py-1.5 text-xs font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-white"
              >
                <span>{isLoading ? '正在内化…' : '内化'}</span>
                <Brain className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </motion.div>

          {/* 移动端搜索框 */}
          <form
            onSubmit={handleSearch}
            className="md:hidden flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="语义搜索你的想法"
                className="w-full rounded-full bg-neutral-950/80 border border-neutral-800 px-9 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-0 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-full border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-900 transition-colors"
              disabled={isSearching}
            >
              搜索
            </button>
          </form>

          {/* 列表 / 搜索结果 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                {searchQuery.trim()
                  ? '搜索结果'
                  : '最近的内化记录'}
              </span>
              {searchQuery.trim() && (
                <span>
                  {isSearching
                    ? '检索中…'
                    : `共 ${listToRender.length} 条`}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {listToRender.length === 0 && (
                <p className="text-xs text-neutral-600">
                  还没有任何笔记。写下一条想法，让 Second Brain
                  替你进行心智建模。
                </p>
              )}

              {listToRender.map((note) => (
                <motion.article
                  key={note.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="rounded-2xl border border-neutral-900 bg-neutral-950/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {note.category && (
                        <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">
                          {note.category}
                        </span>
                      )}
                      {typeof note.similarity === 'number' && (
                        <span className="text-[10px] text-neutral-600">
                          相似度 {note.similarity.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-600">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed mb-2 whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {note.summary && (
                    <p className="text-[11px] text-neutral-400 leading-relaxed mb-2">
                      {note.summary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    {note.mental_model && (
                      <span className="text-[11px] text-neutral-500">
                        心智模型：{note.mental_model}
                      </span>
                    )}

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

