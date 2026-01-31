-- BeachNap Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension (must be done in Supabase dashboard first)
create extension if not exists vector;

-- Profiles (simple username-based)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  created_at timestamptz default now()
);

-- Channels
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Messages with embeddings
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- DM Conversations
create table if not exists dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- DM Participants (2 users per conversation)
create table if not exists dm_participants (
  conversation_id uuid references dm_conversations on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (conversation_id, user_id)
);

-- DM Messages
create table if not exists dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references dm_conversations on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Indexes for vector search (only create if table has rows for ivfflat)
-- For initial setup, we'll use HNSW index which doesn't require training data
create index if not exists messages_embedding_idx on messages using hnsw (embedding vector_cosine_ops);
create index if not exists dm_messages_embedding_idx on dm_messages using hnsw (embedding vector_cosine_ops);

-- Regular indexes for performance
create index if not exists messages_channel_id_idx on messages(channel_id);
create index if not exists messages_created_at_idx on messages(created_at);
create index if not exists dm_messages_conversation_id_idx on dm_messages(conversation_id);
create index if not exists dm_messages_created_at_idx on dm_messages(created_at);

-- RPC function for vector similarity search across channels
create or replace function search_messages(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 20
)
returns table (
  id uuid,
  content text,
  channel_id uuid,
  channel_name text,
  user_id uuid,
  username text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.content,
    m.channel_id,
    c.name as channel_name,
    m.user_id,
    p.username,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from messages m
  join channels c on c.id = m.channel_id
  join profiles p on p.id = m.user_id
  where m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- RPC function for context window (messages around a timestamp)
create or replace function get_context_window(
  p_channel_id uuid,
  p_timestamp timestamptz,
  p_window_minutes int default 30
)
returns table (
  id uuid,
  content text,
  user_id uuid,
  username text,
  created_at timestamptz
)
language sql stable
as $$
  select
    m.id,
    m.content,
    m.user_id,
    p.username,
    m.created_at
  from messages m
  join profiles p on p.id = m.user_id
  where m.channel_id = p_channel_id
    and m.created_at between p_timestamp - (p_window_minutes || ' minutes')::interval
                         and p_timestamp + (p_window_minutes || ' minutes')::interval
  order by m.created_at;
$$;

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table dm_messages;

-- Seed default channels
insert into channels (name, description) values
  ('general', 'General discussion'),
  ('engineering', 'Engineering team chat'),
  ('random', 'Random stuff')
on conflict do nothing;
