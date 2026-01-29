-- Hybrid Search: deterministic tag exact match outranks vector similarity
--
-- Behavior:
-- - If query_text EXACTLY matches any element in notes.tags (case-insensitive),
--   similarity is forced to 1.0.
-- - Otherwise, similarity is computed from vector distance: 1 - (embedding <=> query_embedding)
-- - Tag matches are ALWAYS included regardless of match_threshold.
--
-- Run this in Supabase SQL Editor.

create or replace function public.match_notes(
  query_text text,
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  category text,
  tags text[],
  summary text,
  mental_model text,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  with scored as (
    select
      n.id,
      n.content,
      n.category,
      n.tags,
      n.summary,
      n.mental_model,
      n.created_at,
      exists (
        select 1
        from unnest(coalesce(n.tags, array[]::text[])) t
        where lower(t) = lower(coalesce(query_text, ''))
      ) as tag_match,
      case
        when exists (
          select 1
          from unnest(coalesce(n.tags, array[]::text[])) t
          where lower(t) = lower(coalesce(query_text, ''))
        ) then 1.0
        when n.embedding is null then 0.0
        else (1 - (n.embedding <=> query_embedding))
      end as similarity
    from public.notes n
  )
  select
    scored.id,
    scored.content,
    scored.category,
    scored.tags,
    scored.summary,
    scored.mental_model,
    scored.created_at,
    scored.similarity
  from scored
  where scored.tag_match = true
     or scored.similarity > match_threshold
  order by scored.similarity desc, scored.created_at desc
  limit match_count;
end;
$$;

