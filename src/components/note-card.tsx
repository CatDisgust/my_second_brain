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
    <article className="rounded-2xl border border-neutral-900/80 bg-neutral-950/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {note.category && (
            <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-1 text-xs uppercase tracking-wide text-neutral-300">
              {note.category}
            </span>
          )}
          {typeof note.similarity === 'number' && (
            <span className="text-xs text-neutral-600">
              相似度 {note.similarity.toFixed(2)}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-600 whitespace-nowrap">
          {new Date(note.created_at).toLocaleString()}
        </span>
      </div>

      <p className="text-[17px] text-gray-200 leading-7 mb-3 whitespace-pre-wrap">
        {note.content}
      </p>

      {note.summary && (
        <p className="text-sm text-neutral-300 leading-relaxed mb-3">
          {note.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {note.mental_model && (
            <span className="text-xs text-neutral-500">
              心智模型：{note.mental_model}
            </span>
          )}

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-400"
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
            className="text-xs px-2.5 py-1 rounded-full border border-neutral-800 text-neutral-400 hover:bg-neutral-900 transition-colors disabled:opacity-40"
          >
            {deleting ? '删除中…' : '删除'}
          </button>
        )}
      </div>
    </article>
  );
}

