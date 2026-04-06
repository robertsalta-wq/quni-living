-- RAG knowledge base for Quni AI chat: pgvector + similarity search RPC.
-- Apply via Supabase migrations or run in SQL Editor.

create extension if not exists vector;

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  state text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_base_embedding_ivfflat_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists knowledge_base_category_idx on public.knowledge_base (category);
create index if not exists knowledge_base_state_idx on public.knowledge_base (state);

drop trigger if exists knowledge_base_updated_at on public.knowledge_base;
create trigger knowledge_base_updated_at
  before update on public.knowledge_base
  for each row execute function public.set_updated_at();

alter table public.knowledge_base enable row level security;

-- Similarity: cosine distance (<=>) with vector_cosine_ops; 1 - distance ≈ cosine similarity.
-- Rows without embeddings are excluded.
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_threshold double precision default 0.7,
  match_count int default 4,
  filter_state text default null
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  state text,
  similarity double precision
)
language sql
stable
as $$
  select
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.state,
    (1 - (kb.embedding <=> query_embedding))::double precision as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and (1 - (kb.embedding <=> query_embedding)) > match_threshold
    and (
      filter_state is null
      or trim(filter_state) = ''
      or kb.state is null
      or kb.state = filter_state
    )
  order by kb.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_knowledge_base(vector, double precision, integer, text) from public;
grant execute on function public.match_knowledge_base(vector, double precision, integer, text) to service_role;
