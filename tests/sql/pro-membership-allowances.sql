-- Disposable local database only. Never run against a hosted project.
do $$begin if current_database() not like 'gg_membership%' then raise exception 'local_test_database_required'; end if; end;$$;
\set ON_ERROR_STOP on
insert into auth.users values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004');
insert into private.staff values('10000000-0000-4000-8000-000000000003','admin'),('10000000-0000-4000-8000-000000000004','moderator');
update private.pro_rollout set enforced=true;
do $$declare r jsonb; id uuid; u uuid:='10000000-0000-4000-8000-000000000001'; p uuid:='10000000-0000-4000-8000-000000000002';begin
 r:=public.reserve_journal_allowance(u,'entry',repeat('a',64));id:=(r->>'id')::uuid;
 if not (r->>'allowed')::boolean then raise exception 'first_entry';end if;
 if (public.reserve_journal_allowance(u,'entry',repeat('b',64))->>'error')<>'journal_entry_limit' then raise exception 'entry_cap';end if;
 if (public.reserve_journal_allowance(u,'entry',repeat('a',64))->>'error')<>'request_pending' then raise exception 'duplicate_pending';end if;
 perform public.finish_journal_allowance(u,id,null);
 r:=public.reserve_journal_allowance(u,'entry',repeat('b',64));id:=(r->>'id')::uuid;
 perform public.finish_journal_allowance(u,id,'{"ok":true}');
 r:=public.reserve_journal_allowance(u,'entry',repeat('b',64));if r->>'replay'<>'true' or r->'result'->>'ok'<>'true' then raise exception 'idempotency';end if;
 if (public.reserve_journal_allowance(u,'study',repeat('c',64))->>'error')<>'pro_required' then raise exception 'free_study';end if;
 -- Follow-ups are independent of entry allowance, shared across all entries.
 r:=public.reserve_journal_allowance(u,'followup',repeat('d',64));if r->>'allowed'<>'true' then raise exception 'followup_first';end if;
 if (public.reserve_journal_allowance(u,'followup',repeat('e',64))->>'error')<>'journal_followup_limit' then raise exception 'followup_cap';end if;
 perform public.sync_pro_entitlement(p,true,now()+interval '1 month','production',now());
 for i in 1..3 loop r:=public.reserve_journal_allowance(p,'entry',md5(i::text)||md5(i::text));if r->>'allowed'<>'true' then raise exception 'pro_entry_%',i;end if;end loop;
 if public.reserve_journal_allowance(p,'entry',repeat('f',64))->>'error'<>'journal_entry_limit' then raise exception 'pro_fourth';end if;
 for i in 1..3 loop r:=public.reserve_journal_allowance(p,'followup',md5(i::text)||md5(i::text));if r->>'allowed'<>'true' then raise exception 'pro_follow_%',i;end if;end loop;
 if public.reserve_journal_allowance(p,'followup',repeat('f',64))->>'error'<>'journal_followup_limit' then raise exception 'pro_fourth_follow';end if;
 for i in 1..60 loop r:=public.reserve_journal_allowance(p,'study',md5(i::text)||md5(i::text));if r->>'allowed'<>'true' then raise exception 'study_%',i;end if;end loop;
 if public.reserve_journal_allowance(p,'study',repeat('f',64))->>'error'<>'study_monthly_limit' then raise exception 'study_61';end if;
 -- Moderators do not accidentally become subscription administrators.
 if private.has_pro('10000000-0000-4000-8000-000000000004') then raise exception 'moderator_bypass';end if;
 for i in 1..5 loop r:=public.reserve_journal_allowance('10000000-0000-4000-8000-000000000003','entry',md5(i::text)||md5(i::text));if r->>'allowed'<>'true' then raise exception 'admin_bypass';end if;end loop;
 -- Expiry/revocation and out-of-order renewal/refund snapshots.
 perform public.sync_pro_entitlement(p,false,now(),'production',now()+interval '1 second');
 perform public.sync_pro_entitlement(p,true,now()+interval '1 month','production',now()-interval '1 minute');
 if private.has_pro(p) then raise exception 'stale_webhook_revived';end if;
 -- Rolling into the next UTC day/month does not retain past usage.
 update private.journal_allowance_requests set day=(now() at time zone 'UTC')::date-1 where user_id=u;
 if public.reserve_journal_allowance(u,'entry',repeat('9',64))->>'allowed'<>'true' then raise exception 'daily_reset';end if;
 perform public.sync_pro_entitlement(p,true,now()+interval '1 month','production',now()+interval '2 seconds');
 update private.journal_allowance_requests set day=date_trunc('month',now() at time zone 'UTC')::date-1 where user_id=p and kind='study';
 if public.reserve_journal_allowance(p,'study',repeat('9',64))->>'allowed'<>'true' then raise exception 'monthly_reset';end if;
 if has_function_privilege('authenticated','public.reserve_journal_allowance(uuid,text,text)','execute') then raise exception 'quota_forge';end if;
 if has_function_privilege('authenticated','public.sync_pro_entitlement(uuid,boolean,timestamptz,text,timestamptz)','execute') then raise exception 'plan_forge';end if;
 if has_table_privilege('authenticated','private.pro_entitlements','insert') then raise exception 'entitlement_forge';end if;
end;$$;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select public.membership_status()->>'plan' as free_member,public.membership_status()->>'studyResetsAt' as monthly_reset;
reset role;
