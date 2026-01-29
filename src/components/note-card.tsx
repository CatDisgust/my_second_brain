import * as React from 'react';

export type Note = {
  id: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  summary: string | null;
  mental_model: string | null;
  created_at: string;
  similarity?: number;
};

export type NoteCardProps = {
  note: Note;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
};

export function NoteCard({ note, onDelete, deleting }: NoteCardProps) {
  return (
    <article className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 px-4 py-3 backdrop-blur-sm">
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
        <span className="text-[10px] text-neutral-600 whitespace-nowrap">
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

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-[10px] px-2 py-1 rounded-full border border-neutral-800 text-neutral-400 hover:bg-neutral-900 transition-colors disabled:opacity-40"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        )}
      </div>
    </article>
  );
}

