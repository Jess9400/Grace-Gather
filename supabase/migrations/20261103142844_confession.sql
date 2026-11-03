-- Confessions never share the private journal tables. Only the verified Edge Function
-- service role can access these records. Identifiers are removed from client responses.
create table public.confessions (
 id text primary key, kind text not null check(kind in ('confession','reply')),
 parent text unique references public.confessions(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(body)<=3000), theme text not null, response_type text not null,
 language text not null check(language in ('en','pt','es','ru')),
 status text not null default 'pending' check(status in ('pending','approved','reported','rejected')),
 priority integer not null default 2, signals text not null default '[]', closed integer not null default 0,
 thanked integer not null default 0, claimed_by uuid references auth.users(id) on delete set null,
 claimed_until bigint not null default 0, audio_type text, created bigint not null,
 check ((kind='reply') = (parent is not null))
);
create index confession_queue on public.confessions(status,priority,created);
create index confession_author on public.confessions(author,created);
create table public.confession_reports(id text primary key,target text not null references public.confessions(id) on delete cascade,reporter uuid not null references auth.users(id) on delete cascade,reason text not null,created bigint not null,status text not null default 'open',unique(target,reporter));
create table public.confession_blocks(actor uuid references auth.users(id) on delete cascade,target uuid references auth.users(id) on delete cascade,primary key(actor,target));
create table public.confession_audit(id text primary key,actor uuid references auth.users(id) on delete set null,action text not null,target text,note text not null,created bigint not null);
alter table public.confessions enable row level security;
alter table public.confession_reports enable row level security;
alter table public.confession_blocks enable row level security;
alter table public.confession_audit enable row level security;
revoke all on public.confessions,public.confession_reports,public.confession_blocks,public.confession_audit from anon,authenticated;
grant all on public.confessions,public.confession_reports,public.confession_blocks,public.confession_audit to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('confession-audio','confession-audio',false,5242880,array['audio/mp4','audio/webm','audio/ogg','audio/mpeg','audio/wav']) on conflict(id) do nothing;
-- Atomic operations use database time; no client supplied deadline is trusted.
create function public.confession_store(op text,a jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare out jsonb; r public.confessions; nowms bigint := floor(extract(epoch from clock_timestamp())*1000); n integer;
begin
 case op
 when 'get' then select to_jsonb(c) into out from confessions c where id=a->>0;
 when 'replyFor' then select to_jsonb(c) into out from confessions c where parent=a->>0;
 when 'list' then select coalesce(jsonb_agg(to_jsonb(q)),'[]') into out from (select c.* from confessions c where c.kind='confession' and c.status='approved' and c.closed=0 and c.author<>(a->>0)::uuid and c.language=a->>1 and c.claimed_until<=nowms and not exists(select 1 from confessions child where child.parent=c.id) and not exists(select 1 from confession_blocks b where (b.actor=(a->>0)::uuid and b.target=c.author) or (b.target=(a->>0)::uuid and b.actor=c.author)) order by c.created limit 40) q;
 when 'reserved' then select coalesce(jsonb_agg(to_jsonb(c)),'[]') into out from confessions c where c.claimed_by=(a->>0)::uuid and c.claimed_until>nowms and c.status='approved' and c.closed=0 and not exists(select 1 from confessions child where child.parent=c.id);
 when 'mine' then select coalesce(jsonb_agg(to_jsonb(q)),'[]') into out from (select * from confessions where author=(a->>0)::uuid order by created desc limit 100) q;
 when 'queue' then select coalesce(jsonb_agg(to_jsonb(q)),'[]') into out from (select * from confessions where status in ('pending','reported') order by priority,created limit 100) q;
 when 'reports' then select coalesce(jsonb_agg(to_jsonb(q)),'[]') into out from (select id,target,reason,created from confession_reports where status='open' order by created limit 100) q;
 when 'recent' then select to_jsonb(count(*)) into out from confessions where author=(a->>0)::uuid and created>nowms-3600000;
 when 'recentReports' then select to_jsonb(count(*)) into out from confession_reports where reporter=(a->>0)::uuid and created>nowms-3600000;
 when 'blocked' then select to_jsonb(exists(select 1 from confession_blocks where (actor=(a->>0)::uuid and target=(a->>1)::uuid) or (target=(a->>0)::uuid and actor=(a->>1)::uuid))) into out;
 when 'claim' then
  select * into r from confessions where id=a->>0 for update;
  if not found or r.kind<>'confession' or r.status<>'approved' or r.closed<>0 or (r.claimed_until>nowms and r.claimed_by<>(a->>1)::uuid) or exists(select 1 from confessions where parent=r.id) then return 'false';end if;
  update confessions set claimed_by=(a->>1)::uuid,claimed_until=case when claimed_by=(a->>1)::uuid and claimed_until>nowms then claimed_until else nowms+21600000 end where id=r.id;out='true';
 when 'insert' then
  r=jsonb_populate_record(null::public.confessions,a->0);
  if r.parent is not null then
   perform 1 from confessions where id=r.parent and status='approved' and closed=0 and claimed_by=r.author and claimed_until>nowms for update;
   if not found then return 'false';end if;
  end if;
  insert into confessions select r.* on conflict do nothing;get diagnostics n=row_count;out=to_jsonb(n=1);
 when 'close' then update confessions set closed=1 where id=a->>0 and author=(a->>1)::uuid;
 when 'thank' then update confessions set thanked=1 where id=a->>0;
 when 'remove' then delete from confessions where id=a->>0;
 when 'audit' then insert into confession_audit values(gen_random_uuid()::text,(a->>0)::uuid,a->>1,a->>2,a->>3,nowms);
 when 'report' then
  insert into confession_reports(id,target,reporter,reason,created) values(a->0->>'id',a->0->>'target',(a->0->>'reporter')::uuid,a->0->>'reason',nowms) on conflict do nothing;
  update confessions set status='reported' where id=a->0->>'target';
 when 'block' then insert into confession_blocks values((a->>0)::uuid,(a->>1)::uuid) on conflict do nothing;
 when 'moderate' then
  update confessions set status=a->>1 where id=a->>0;
  update confession_reports set status='reviewed' where target=a->>0;
  insert into confession_audit values(gen_random_uuid()::text,(a->>2)::uuid,a->>1,a->>0,a->>3,nowms);
 else raise exception 'invalid_operation';
 end case;
 return out;
end $$;
revoke all on function public.confession_store(text,jsonb) from public,anon,authenticated;
grant execute on function public.confession_store(text,jsonb) to service_role;

create function public.staff_role_for_confession(uid uuid) returns text language sql security definer set search_path=public,pg_temp as $$ select role from private.staff where user_id=uid $$;
revoke all on function public.staff_role_for_confession(uuid) from public,anon,authenticated;
grant execute on function public.staff_role_for_confession(uuid) to service_role;
