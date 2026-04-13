-- Allow logged-in users (students/landlords) to read knowledge articles for
-- in-app deflection (e.g. Qase submit modal). Columns per public.knowledge_base:
-- id, title, content, category, state, embedding, created_at, updated_at.

drop policy if exists "Knowledge base select authenticated" on public.knowledge_base;

create policy "Knowledge base select authenticated"
  on public.knowledge_base
  for select
  to authenticated
  using (true);
