-- Run after study_notebook_bootstrap.sql + the migration in a disposable DB.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.study_notebook('save','{"verse":"web:GEN.1.1","reference":"Genesis 1:1","body":"Private beginning and hope"}');
select public.study_notebook('invite','{"peer":"20000000-0000-0000-0000-000000000002","plan":14}');
do $$ declare inv uuid;begin
 assert (public.study_notebook('stats','{}')->>'notes')::integer=1,'Own note was not saved';
 assert jsonb_array_length(public.study_notebook('notes','{"search":"hope"}'))=1,'Search missed note';
 assert jsonb_array_length(public.study_notebook('notes','{"search":"missing"}'))=0,'Search not scoped';
 assert not has_table_privilege('authenticated','private.study_notes','select'),'Raw private notes exposed';
 assert not has_function_privilege('anon','public.study_notebook(text,jsonb)','execute'),'Anonymous API access';
 inv:=(public.study_notebook('invitations','{}')->0->>'id')::uuid;
 begin
  perform public.study_notebook('shared',jsonb_build_object('invitation',inv));
  raise exception 'Expected pending invitation denial';
 exception when others then if sqlerrm<>'acceptance_required' then raise;end if;end;
 begin
  perform public.study_notebook('respond',jsonb_build_object('invitation',inv,'response','accepted'));
  raise exception 'Inviter must not accept on recipient behalf';
 exception when others then if sqlerrm<>'forbidden' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',false);
do $$ declare inv uuid;begin
 assert public.study_notebook('note','{"verse":"web:GEN.1.1"}')='null'::jsonb,'Other reader can read private note';
 assert jsonb_array_length(public.study_notebook('notes','{}'))=0,'Other notes leaked in list';
 inv:=(public.study_notebook('invitations','{}')->0->>'id')::uuid;
 perform public.study_notebook('respond',jsonb_build_object('invitation',inv,'response','accepted'));
 assert jsonb_array_length(public.study_notebook('shared',jsonb_build_object('invitation',inv)))=0,'Acceptance automatically exposed notes';
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$ declare inv uuid;begin
 inv:=(public.study_notebook('invitations','{}')->0->>'id')::uuid;
 perform public.study_notebook('share',jsonb_build_object('invitation',inv,'verse','web:GEN.1.1'));
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',false);
do $$ declare inv uuid;shared jsonb;begin
 inv:=(public.study_notebook('invitations','{}')->0->>'id')::uuid;
 shared:=public.study_notebook('shared',jsonb_build_object('invitation',inv));
 assert jsonb_array_length(shared)=1,'Explicit sharing did not expose snapshot';
 perform public.study_notebook('unshare',jsonb_build_object('invitation',inv,'note',shared->0->>'id'));
 assert jsonb_array_length(public.study_notebook('shared',jsonb_build_object('invitation',inv)))=1,'Non-author removed another author note';
 perform public.study_notebook('leave',jsonb_build_object('invitation',inv));
 begin
  perform public.study_notebook('shared',jsonb_build_object('invitation',inv));
  raise exception 'Leaving must revoke shared access';
 exception when others then if sqlerrm<>'acceptance_required' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',false);
do $$begin
 assert jsonb_array_length(public.study_notebook('invitations','{}'))=0,'Invitation exposed to third user';
 begin
  perform public.study_notebook('invite','{"peer":"20000000-0000-0000-0000-000000000002","plan":0}');
  raise exception 'Non-friend invitation must fail';
 exception when others then if sqlerrm<>'friend_required' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$ begin
 assert public.study_notebook('note','{"verse":"web:GEN.1.1"}')->>'body'='Private beginning and hope','Revoking group removed private note';
 perform public.study_notebook('delete','{"verse":"web:GEN.1.1"}');
 assert (public.study_notebook('stats','{}')->>'notes')::integer=0,'Delete failed';
end $$;
reset role;
select 'study notebook security checks passed' as result;
