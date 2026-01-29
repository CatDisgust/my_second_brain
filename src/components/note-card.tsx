import * as React from 'react';

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
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
};

export function NoteCard({ note, onDelete, deleting }: NoteCardProps) {
  const matchBadge =
    note.match_type === 'vector'
      ? { label: 'Semantic', className: 'bg-neutral-900 text-sky-300/80' }
      : note.match_type === 'tag' || note.match_type === 'keyword'
        ? { label: 'Exact', className: 'bg-neutral-900 text-emerald-300/80' }
        : null;

  return (
    <article className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {note.category && (
            <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-1 text-[13px] uppercase tracking-wide text-gray-500">
              {note.category}
            </span>
          )}
          {typeof note.similarity === 'number' && (
            <span className="inline-flex items-center gap-2">
              <span className="text-[13px] text-gray-500">
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
        <span className="text-[13px] text-gray-500 whitespace-nowrap">
          {new Date(note.created_at).toLocaleString()}
        </span>
      </div>

      <p className="text-[16px] leading-relaxed text-gray-300 mb-3 whitespace-pre-wrap">
        {note.content}
      </p>

      {note.summary && (
        <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
          {note.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {note.mental_model && (
            <span className="text-[13px] text-gray-500">
              心智模型：{note.mental_model}
            </span>
          )}

          {note.tags && note.tags.length > 0 && (
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
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-[15px] font-medium px-3 py-1.5 rounded-full border border-neutral-800 text-gray-400 hover:bg-neutral-900 transition-colors disabled:opacity-40"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        )}
      </div>
    </article>
  );
}

