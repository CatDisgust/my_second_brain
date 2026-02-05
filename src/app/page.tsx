'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { NoteCard, type Note } from '@/components/note-card';

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
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [content]);

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const res = await fetch('/api/notes?limit=5', { credentials: 'include' });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/login?redirectedFrom=/';
            return;
          }
          setIsLoadingNotes(false);
          return;
        }

        if (Array.isArray(data.notes)) {
          setNotes(data.notes);
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
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note');
      }

      if (data.note) {
        setNotes((prev) => [data.note, ...prev]);
      }
      setSuccessMessage('已内化');
      setTimeout(() => {
        setSuccessMessage(null);
        setContent('');
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col bg-transparent">
      <div className="relative flex-1 flex flex-col bg-transparent">
        <div className="mx-auto w-full max-w-2xl px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-6 flex flex-col gap-8">
          {/* 输入区：直接聚焦 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 p-5 shadow-[0_8px_30px_rgba(247,235,225,0.8)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-slate-600" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-semibold text-stone-900">
                    Capture your current insight
                  </span>
                  <span className="text-[13px] text-slate-600">
                    一次只记录一个真正重要的想法
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`relative rounded-xl border border-white/40 bg-white/50 backdrop-blur-sm p-5 transition-all duration-300 ${
                isLoading ? 'border-stone-300/50 bg-stone-50/50' : ''
              }`}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你刚刚的顿悟、感想或痛点。比如：我意识到自己在赚钱这件事上总是出于恐惧，而不是创造价值的兴趣……"
                className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-stone-900 placeholder:text-slate-500 focus:outline-none"
                rows={3}
                disabled={isLoading}
              />
            </div>

            {loadingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-4 flex items-center gap-3 text-[13px] text-slate-600"
              >
                <div className="relative h-[2px] w-20 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full w-1/2 rounded-full bg-slate-400"
                    initial={{ x: '-50%' }}
                    animate={{ x: '150%' }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
                <span className="whitespace-nowrap">{loadingMessage}</span>
              </motion.div>
            )}

            {successMessage && !loadingMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[13px] font-medium text-stone-900">
                  {successMessage}
                </span>
              </motion.div>
            )}

            {error && (
              <p className="mt-4 text-[13px] text-red-600">{error}</p>
            )}

            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-[13px] text-slate-600">
                “内化” 会自动解析心智模型，并存入 Second Brain。
              </span>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97, y: 0 }}
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="inline-flex flex-row items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-5 h-10 text-[15px] font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <span className="whitespace-nowrap">
                  {isLoading ? '正在内化…' : '内化'}
                </span>
                <Brain className="h-4 w-4 shrink-0" />
              </motion.button>
            </div>
          </motion.div>

          {/* 最近一条内化记录：作为 Context，无杂音 */}
          {isLoadingNotes && (
            <div className="flex justify-center py-8">
              <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
            </div>
          )}

          {!isLoadingNotes && notes.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-2"
            >
              <span className="text-[13px] text-slate-600">
                最近的内化
              </span>
              <div className="flex flex-col gap-3">
                {notes.map((note) => (
                  <NoteCard key={String(note.id)} note={note} />
                ))}
              </div>
            </motion.section>
          )}

          {!isLoadingNotes && notes.length === 0 && (
            <p className="text-[13px] text-slate-600 text-center py-4">
              写下第一条想法，让 Second Brain 替你内化。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
