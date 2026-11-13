\set ON_ERROR_STOP on
\ir base.sql
create table public.comments(id uuid primary key,status text);
create table public.pay_forward_submissions(id uuid primary key,status text);
create schema net;
create schema cron;
create schema vault;
create table vault.decrypted_secrets(name text,decrypted_secret text);
create table net.requests(id bigint generated always as identity,url text,headers jsonb,body jsonb);
create table net._http_response(id bigint primary key,status_code integer,content text,timed_out boolean,error_msg text);
create function net.http_post(url text,headers jsonb,body jsonb) returns bigint language sql as $$insert into net.requests(url,headers,body) values(url,headers,body) returning id$$;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
