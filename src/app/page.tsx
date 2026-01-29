'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, LogOut, Search, Sparkles } from 'lucide-react';
import {
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/stagger-list';

// 隐藏横向滚动条（Entropy Reduction View）
// 这里用内联全局样式避免引入额外依赖/配置
const noScrollbarCss = `
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

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

const CORE_MENTAL_MODELS = [
  '基本事实',
  '精神熵',
  '认知重构',
  '杠杆效应',
  '关键动能',
  '一人公司',
] as const;

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [notesLoaded, setNotesLoaded] = useState(false);

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
      setIsLoadingNotes(true);
      try {
        const res = await fetch('/api/notes');
        const data = await res.json();
        
        if (!res.ok) {
          console.error('Failed to load notes:', data.error);
          setIsLoadingNotes(false);
          return;
        }
        
        if (Array.isArray(data.notes)) {
          console.log(`Loaded ${data.notes.length} notes`);
          setNotes(data.notes);
          // 延迟一帧确保 DOM 更新后再触发动画
          requestAnimationFrame(() => {
            setNotesLoaded(true);
          });
        } else {
          console.warn('Invalid notes data format:', data);
        }
      } catch (e) {
        console.error('Error loading notes:', e);
      } finally {
        setIsLoadingNotes(false);
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
      setSuccessMessage('已内化');
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

  const listToRender =
    searchQuery.trim().length > 0 ? searchResults : notes;

  const handleLogout = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.error('Supabase env missing');
      window.location.href = '/login';
      return;
    }

    setIsLoggingOut(true);
    try {
      const supabase = createBrowserClient(url, anonKey);
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setIsLoggingOut(false);
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col relative overflow-hidden">
      <style>{noScrollbarCss}</style>
      {/* 背景光晕 */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(120,120,255,0.18),_transparent_60%)]" />
        <div className="absolute bottom-[-120px] right-[-40px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_60%)]" />
      </div>

      {/* 顶部导航 + 搜索 */}
      <header className="border-b border-neutral-900/80 backdrop-blur-sm sticky top-0 z-20 bg-black/70">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1 justify-end md:justify-between">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex items-center gap-3 cursor-default"
            >
              <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center shadow-[0_0_24px_rgba(15,23,42,0.7)]">
                <Brain className="h-5 w-5 text-neutral-200" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-400">
                  Second Brain
                </span>
                <span className="text-xs text-neutral-600">
                  Capture insights. Crystallize models. Design identity.
                </span>
              </div>
            </motion.div>

            <div className="flex items-center gap-3">
              <form
                onSubmit={handleSearch}
                className="hidden md:flex flex-col gap-2 items-stretch"
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-60">
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
                  {isSearching ? '检索中…' : '搜索'}
                </button>
                </div>

                {/* 核心思维模型胶囊栏 */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={async () => {
                      setActiveModel(null);
                      setSearchQuery('');
                      setSearchResults([]);
                      // 重新加载所有笔记
                      setIsLoadingNotes(true);
                      setNotesLoaded(false);
                      try {
                        const res = await fetch('/api/notes');
                        const data = await res.json();
                        if (Array.isArray(data.notes)) {
                          setNotes(data.notes);
                          requestAnimationFrame(() => {
                            setNotesLoaded(true);
                          });
                        }
                      } catch (e) {
                        console.error('Error reloading notes:', e);
                      } finally {
                        setIsLoadingNotes(false);
                      }
                    }}
                    className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      activeModel === null && !searchQuery.trim()
                        ? 'bg-neutral-100 text-black border-neutral-300'
                        : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
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
                        runSearch(model, 'tag');
                      }}
                      className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                        activeModel === model
                          ? 'bg-neutral-100 text-black border-neutral-300'
                          : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </form>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-neutral-900 transition-colors disabled:opacity-40"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isLoggingOut ? '正在退出…' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 pt-12 pb-20 space-y-12">
          {/* 中央输入卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-3xl border border-neutral-800/80 bg-gradient-to-b from-neutral-950/90 to-black/70 px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.85)]"
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
              className={`relative rounded-2xl border border-neutral-800/80 bg-neutral-950/60 px-4 py-3 transition-all duration-300 ${
                isLoading
                  ? 'backdrop-blur-[3px] border-neutral-700 bg-neutral-950/80'
                  : ''
              }`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你刚刚的顿悟、感想或痛点。比如：我意识到自己在赚钱这件事上总是出于恐惧，而不是创造价值的兴趣……"
                className="w-full resize-none bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none leading-relaxed max-w-2xl"
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
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-900/60 border border-neutral-800/50 px-3 py-1.5"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
                <span className="text-[11px] font-medium tracking-wide text-neutral-300">
                  {successMessage}
                </span>
              </motion.div>
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

          {/* 移动端核心思维模型胶囊栏 */}
          <div className="md:hidden -mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={async () => {
                setActiveModel(null);
                setSearchQuery('');
                setSearchResults([]);
                // 重新加载所有笔记
                setIsLoadingNotes(true);
                setNotesLoaded(false);
                try {
                  const res = await fetch('/api/notes');
                  const data = await res.json();
                  if (Array.isArray(data.notes)) {
                    setNotes(data.notes);
                    requestAnimationFrame(() => {
                      setNotesLoaded(true);
                    });
                  }
                } catch (e) {
                  console.error('Error reloading notes:', e);
                } finally {
                  setIsLoadingNotes(false);
                }
              }}
              className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                activeModel === null && !searchQuery.trim()
                  ? 'bg-neutral-100 text-black border-neutral-300'
                  : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
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
                  runSearch(model, 'tag');
                }}
                className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  activeModel === model
                    ? 'bg-neutral-100 text-black border-neutral-300'
                    : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                {model}
              </button>
            ))}
          </div>

          {/* 列表 / 搜索结果 */}
          <section className="space-y-4">
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
              {isLoadingNotes && !searchQuery.trim() && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
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
                  还没有任何笔记。写下一条想法，让 Second Brain
                  替你进行心智建模。
                </p>
              )}

              {!isLoadingNotes && listToRender.length > 0 && (
                <StaggerContainer
                  key={`stagger-${notesLoaded ? 'ready' : 'loading'}-${listToRender.length}`}
                  className="space-y-3"
                >
                  {listToRender.map((note) => (
                    <StaggerItem key={note.id}>
                      <motion.article
                        className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 px-4 py-3 backdrop-blur-sm"
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
                      <div className="flex flex-wrap items-center gap-2">
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

                      <button
                        onClick={async () => {
                          // 乐观更新：先从列表中移除，再与后端同步
                          if (deletingId) return;
                          setDeletingId(note.id);
                          setNotes((prev) =>
                            prev.filter((n) => n.id !== note.id),
                          );
                          setSearchResults((prev) =>
                            prev.filter((n) => n.id !== note.id),
                          );

                          try {
                            const res = await fetch(
                              `/api/notes?id=${note.id}`,
                              {
                                method: 'DELETE',
                              },
                            );
                            const data = await res.json();
                            if (!res.ok || !data.ok) {
                              throw new Error(
                                data.error || 'Failed to delete',
                              );
                            }
                          } catch (e) {
                            console.error(e);
                            // 简单提示用户出错，数据可以通过刷新重新同步
                            alert('删除失败，请刷新页面后重试。');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === note.id}
                        className="text-[10px] px-2 py-1 rounded-full border border-neutral-800 text-neutral-400 hover:bg-neutral-900 transition-colors disabled:opacity-40"
                      >
                        {deletingId === note.id ? '删除中…' : '删除'}
                      </button>
                    </div>
                      </motion.article>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

