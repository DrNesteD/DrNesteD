-- در Supabase: SQL Editor → New query → همه این فایل رو paste و Run کن.
-- ⚠️ قبل از اجرا، admin@example.com رو با ایمیل ادمین خودت عوض کن (دو جا).

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  cat text not null check (cat in ('videos','minecraft')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 3000),
  author text check (char_length(author) <= 24),
  created_at timestamptz not null default now()
);

alter table public.news enable row level security;
alter table public.news force row level security;

-- همه می‌تونن بخونن
create policy "public read" on public.news for select to anon, authenticated using (true);

-- فقط ادمین (با ایمیل مشخص) می‌تونه بنویسه/ویرایش/حذف کنه
create policy "admin insert" on public.news for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');
create policy "admin update" on public.news for update to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');
create policy "admin delete" on public.news for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com');

-- لایه‌ی دوم دفاع: کاربر ناشناس اصلاً اجازه‌ی نوشتن نداره
revoke all on public.news from anon;
grant select on public.news to anon;
grant select, insert, update, delete on public.news to authenticated;
