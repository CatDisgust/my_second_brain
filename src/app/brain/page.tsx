'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Mic } from 'lucide-react';
import {
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/stagger-list';
import { NoteCard, type Note } from '@/components/note-card';
import { SearchSkeleton } from '@/components/search-skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { useVoiceInput } from '@/hooks/use-voice-input';

const CORE_MENTAL_MODELS = [
  '基本事实',
  '精神熵',
  '认知重构',
  '杠杆效应',
  '关键动能',
  '一人公司',
] as const;

export interface SearchResult {
  id: number | string;
  content: string;
  tags: string[];
  similarity: number;
  match_type: 'tag' | 'keyword' | 'vector';
  created_at: string;
}

function asSearchResults(input: unknown): SearchResult[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw: any) => {
      const id = raw?.id;
      const content = raw?.content;
      const created_at = raw?.created_at;
      const similarity = raw?.similarity;
      const match_type = raw?.match_type;
      const tags = raw?.tags;

      const idOk = typeof id === 'string' || typeof id === 'number';
      const contentOk = typeof content === 'string';
      const createdAtOk = typeof created_at === 'string';
      const similarityOk = typeof similarity === 'number';
      // Some deployments may return `match_type` as NULL/omitted; default to 'vector'.
      const normalizedMatchType: SearchResult['match_type'] =
        match_type === 'tag' || match_type === 'keyword' || match_type === 'vector'
          ? match_type
          : 'vector';
      const tagsOk =
        Array.isArray(tags) && tags.every((t: unknown) => typeof t === 'string');

      if (!idOk || !contentOk || !createdAtOk || !similarityOk) {
        return null;
      }

      return {
        id,
        content,
        created_at,
        similarity,
        match_type: normalizedMatchType,
        tags: tagsOk ? (tags as string[]) : [],
      } satisfies SearchResult;
    })
    .filter(Boolean) as SearchResult[];
}

function MatchBadge({ matchType }: { matchType: SearchResult['match_type'] }) {
  const cfg =
    matchType === 'tag'
      ? { text: '🎯 Precision', cls: 'bg-emerald-500/15 text-emerald-300' }
      : matchType === 'keyword'
        ? { text: '🔍 Match', cls: 'bg-sky-500/15 text-sky-300' }
        : { text: '🧠 Related', cls: 'bg-fuchsia-500/15 text-fuchsia-300' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
}

function SearchResultCard({ note }: { note: SearchResult }) {
  return (
    <article className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 p-5 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="text-[13px] text-gray-500">
            相似度 {note.similarity.toFixed(2)}
          </span>
          <MatchBadge matchType={note.match_type} />
        </div>
        <span className="text-[13px] text-gray-500 whitespace-nowrap">
          {new Date(note.created_at).toLocaleString()}
        </span>
      </div>

      <p className="text-[16px] leading-relaxed text-gray-300 mb-3 whitespace-pre-wrap">
        {note.content}
      </p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-[13px] px-2.5 py-0.5 rounded-full bg-neutral-900 text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function BrainPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    toggleListening,
  } = useVoiceInput({
    language: 'zh-CN',
    silenceAutoSubmitMs: 2000,
  });

  // Sync voice transcript into search input in real time
  useEffect(() => {
    if (transcript) setSearchQuery(transcript);
  }, [transcript]);

  // 初始加载：拉取更多历史记录（知识整理页用）
  useEffect(() => {
    const loadAllNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const res = await fetch('/api/notes?limit=400', { credentials: 'include' });
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

  const normalizedQuery = debouncedQuery.trim();
  const showSearchMode = normalizedQuery.length > 0;
  const totalCount = showSearchMode ? results.length : notes.length;

  useEffect(() => {
    let cancelled = false;

    const doSearch = async () => {
      const q = normalizedQuery;
      if (!q) {
        setResults([]);
        setError(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          credentials: 'include',
        });
        const json = await res.json();
        // Debug: inspect actual response shape in browser console
        console.log('Search Results:', json?.notes ?? json);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brain/page.tsx:search.raw',message:'Search raw response inspected',data:{ok:res.ok,status:res.status,notesIsArray:Array.isArray(json?.notes),notesLength:Array.isArray(json?.notes)?json.notes.length:0,firstKeys:Array.isArray(json?.notes)&&json.notes[0]?Object.keys(json.notes[0]):[],firstTypes:Array.isArray(json?.notes)&&json.notes[0]?{id:typeof json.notes[0].id,similarity:typeof json.notes[0].similarity,match_type:typeof json.notes[0].match_type,created_at:typeof json.notes[0].created_at,tags:Array.isArray(json.notes[0].tags)?'array':typeof json.notes[0].tags,contentLength:typeof json.notes[0].content==='string'?json.notes[0].content.length:null}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run-ui1',hypothesisId:'UI-TYPES'})}).catch(()=>{});
        // #endregion

        if (!res.ok) {
          throw new Error(json?.error || '搜索失败');
        }

        const parsed = asSearchResults(json?.notes);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/05e81211-6af8-4ff4-b50d-5952e5cf42ba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brain/page.tsx:search.parsed',message:'Search results parsed',data:{rawLength:Array.isArray(json?.notes)?json.notes.length:0,parsedLength:parsed.length,firstParsed:parsed[0]?{idType:typeof parsed[0].id,similarityType:typeof parsed[0].similarity,match_type:parsed[0].match_type,tagsLength:parsed[0].tags.length}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run-ui1',hypothesisId:'UI-PARSE'})}).catch(()=>{});
        // #endregion
        if (!cancelled) setResults(parsed);
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          setResults([]);
          setError(e instanceof Error ? e.message : '搜索失败');
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    void doSearch();
    return () => {
      cancelled = true;
    };
  }, [normalizedQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    // Keep Enter key UX, but actual searching is debounced.
    e.preventDefault();
  };

  const visibleNotes = useMemo(() => notes, [notes]);

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-8">
        {/* 搜索 + 核心思维模型胶囊栏 */}
        <section className="space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="在整个第二大脑中进行语义检索…"
                className="w-full rounded-full bg-neutral-950/80 border border-neutral-800 pl-9 pr-11 py-2.5 text-[16px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-0 transition-colors"
              />
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isListening) setSearchQuery('');
                    toggleListening();
                  }}
                  aria-label={isListening ? '停止语音输入' : '语音输入'}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-black ${
                    isListening
                      ? 'text-red-400 bg-red-500/15 ring-2 ring-red-500/40 animate-pulse'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80'
                  }`}
                >
                  <Mic className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="text-[15px] font-medium px-3.5 py-2 rounded-full border border-neutral-800 text-neutral-300 hover:bg-neutral-900 transition-colors"
              disabled={isSearching}
            >
              {isSearching ? '检索中…' : '搜索'}
            </button>
          </form>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setActiveModel(null);
                setSearchQuery('');
                setResults([]);
              }}
              className={`shrink-0 text-[15px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
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
                }}
                className={`shrink-0 text-[15px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
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
        <section className="space-y-4">
          <div className="flex items-center justify-between text-[13px] text-gray-500">
            <span>
              {showSearchMode
                ? '搜索结果'
                : '全部内化记录'}
            </span>
            <span>
              {isLoadingNotes
                ? '加载中…'
                : `共 ${totalCount} 条`}
            </span>
          </div>

          {(error || voiceError) && (
            <p className="text-[13px] text-red-400">
              {error ?? voiceError}
            </p>
          )}

          {!showSearchMode && isLoadingNotes && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative h-5 w-5">
                <div className="absolute inset-0 rounded-full bg-neutral-200/30 animate-ping" />
                <div className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-neutral-200/70 animate-pulse" />
              </div>
              <div className="text-[13px] tracking-[0.18em] text-gray-500 animate-pulse">
                Syncing Second Brain...
              </div>
            </div>
          )}

          {showSearchMode && normalizedQuery === '' && (
            <p className="text-[13px] text-gray-500">
              Start typing to search...
            </p>
          )}

          {showSearchMode && isSearching && <SearchSkeleton />}

          {showSearchMode && !isSearching && results.length === 0 && normalizedQuery !== '' && (
            <p className="text-[13px] text-gray-500">
              No results found
            </p>
          )}

          {!showSearchMode && !isLoadingNotes && visibleNotes.length === 0 && (
            <p className="text-[13px] text-gray-500">
              还没有任何笔记，或当前条件下没有匹配结果。
            </p>
          )}

          {!showSearchMode && !isLoadingNotes && visibleNotes.length > 0 && (
            <StaggerContainer className="space-y-3">
              {visibleNotes.map((note) => (
                <StaggerItem key={String(note.id)}>
                  <NoteCard note={note} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          {showSearchMode && !isSearching && results.length > 0 && (
            <div className="space-y-3">
              {results.map((note, index) => (
                <div
                  key={note.id.toString()}
                  className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <SearchResultCard note={note} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

