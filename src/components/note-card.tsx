import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { Trash2 } from 'lucide-react';

const markdownComponents = {
  h3: ({ node, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="font-bold text-lg mb-2 mt-4 text-slate-800 first:mt-0" {...props} />
  ),
  p: ({ node, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-4 leading-relaxed text-slate-700 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />
  ),
  li: ({ node, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="text-slate-700" {...props} />
  ),
  hr: ({ node, ...props }: React.ComponentPropsWithoutRef<'hr'>) => (
    <hr className="my-6 border-stone-200" {...props} />
  ),
};

export type Note = {
  id: string | number;
  content: string;
  category: string | null;
  tags: string[] | null;
  summary: string | null;
  mental_model: string | null;
  created_at: string;
  similarity?: number;
  match_type?: 'tag' | 'keyword' | 'vector' | string;
};

export type NoteCardProps = {
  note: Note;
  onDelete?: (id: string | number) => void | Promise<void>;
  deleting?: boolean;
};

const DELETE_CONFIRM_MESSAGE =
  '确定要删除这条内化记录吗？这将无法恢复。';

export function NoteCard({ note, onDelete, deleting }: NoteCardProps) {
  const matchBadge =
    note.match_type === 'vector'
      ? { label: 'Semantic', className: 'bg-sky-100 text-sky-700' }
      : note.match_type === 'tag' || note.match_type === 'keyword'
        ? { label: 'Exact', className: 'bg-emerald-100 text-emerald-700' }
        : null;

  const handleDeleteClick = () => {
    if (!onDelete) return;
    if (!window.confirm(DELETE_CONFIRM_MESSAGE)) return;
    void onDelete(note.id);
  };

  return (
    <article className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 pl-6 pr-10 pt-6 pb-6 shadow-[0_8px_30px_rgba(247,235,225,0.8)] relative">
      {onDelete && (
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={deleting}
          aria-label="删除这条内化记录"
          className="absolute top-3 right-3 p-1.5 rounded-md text-stone-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-white/70 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-wrap ml-0 pl-0 mb-2">
        {note.category && (
          <span className="text-teal-700 font-extrabold text-sm tracking-widest uppercase ml-0">
            {note.category}
          </span>
        )}
        {typeof note.similarity === 'number' && (
          <span className="inline-flex items-center gap-2">
            <span className="text-[13px] text-slate-600">
              相似度 {note.similarity.toFixed(2)}
            </span>
            {matchBadge && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${matchBadge.className}`}
              >
                {matchBadge.label}
              </span>
            )}
          </span>
        )}
      </div>

      <p className="font-bold text-slate-900 text-lg leading-tight whitespace-pre-wrap ml-0 pl-0 mb-2">
        {note.content}
      </p>

      {note.summary && (
        <div className="text-[15px] leading-7 ml-0 pl-0 mb-4 [&_h3]:first:mt-0">
          <ReactMarkdown components={markdownComponents}>
            {note.summary}
          </ReactMarkdown>
        </div>
      )}

      {note.mental_model && (
        <div className="mt-0 mb-4 text-[15px] leading-7 ml-0 pl-0">
          <span className="font-bold text-indigo-600 mr-2">心智模型：</span>
          <div className="text-slate-700 mt-1">
            <ReactMarkdown components={markdownComponents}>
              {note.mental_model}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <footer className="flex justify-between items-center gap-4 mt-6 flex-wrap ml-0 pl-0">
        <div className="flex flex-wrap gap-2">
          {note.tags && note.tags.length > 0 && note.tags.map((tag) => (
            <span
              key={tag}
              className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-stone-400 font-medium whitespace-nowrap shrink-0">
          {new Date(note.created_at).toLocaleString()}
        </span>
      </footer>
    </article>
  );
}

