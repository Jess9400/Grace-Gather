-- Disposable test database only. Changes rolled back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.study_notebook('save','{"verse":"web:JHN.1.1","reference":"John 1:1","body":"Personal reflection"}');
select public.study_notebook('save','{"verse":"web:JHN.1.1","reference":"John 1:1","kind":"plan","context":"0","body":"Plan reflection"}');
select public.study_notebook('save','{"verse":"web:JHN.1.1","reference":"John 1:1","kind":"devotional","context":"gg-year1-d001","body":"Devotional reflection"}');
do $$begin
 assert jsonb_array_length(public.study_notebook('notes','{}'))=3,'Contexts overwrite each other';
 assert jsonb_array_length(public.study_notebook('notes','{"kind":"plan"}'))=1,'Plan filter mixed personal notes';
 assert public.study_notebook('note','{"verse":"web:JHN.1.1"}')->>'body'='Personal reflection','Legacy client lost personal note';
end$$;
select public.study_notebook('invite','{"plan":0,"peer":"20000000-0000-0000-0000-000000000002"}');
reset role;
do $$begin assert (select count(*) from private.activity_notices where kind='study_invitation')>=1,'Invite notice missing';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$declare inv jsonb;begin
 assert public.study_notebook('note','{"verse":"web:JHN.1.1","kind":"plan","context":"0"}')='null'::jsonb,'Private note exposed';
 assert jsonb_array_length(public.study_notebook('shared_all','{}'))=0,'Invitation alone exposes notes';
 inv:=public.study_notebook('invitations','{}')->0;
 perform public.study_notebook('respond',jsonb_build_object('invitation',inv->>'id','response','accepted'));
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$declare inv jsonb;begin
 inv:=public.study_notebook('invitations','{}')->0;
 perform public.study_notebook('share',jsonb_build_object('invitation',inv->>'id','kind','plan','context','0','verse','web:JHN.1.1'));
end$$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$declare shared jsonb;begin
 shared:=public.study_notebook('shared_all','{}')->0;
 assert jsonb_array_length(public.study_notebook('shared',jsonb_build_object('invitation',shared->>'invitation')))=1,'Plan shared view failed';
 assert shared->>'body'='Plan reflection','Shared plan note unavailable';
 perform public.study_notebook('comment',jsonb_build_object('invitation',shared->>'invitation','note',shared->>'id','body','My reply to the plan note'));
 assert jsonb_array_length(public.study_notebook('comments',jsonb_build_object('invitation',shared->>'invitation','note',shared->>'id')))=1,'Comment unavailable';
end$$;
reset role;
do $$declare n private.activity_notices;begin
 select * into n from private.activity_notices where kind='study_comment';
 assert n.recipient='10000000-0000-0000-0000-000000000001'::uuid,'Comment notice recipient wrong';
 assert private.member_push_still_relevant(n.recipient,'activity',n.id),'Push not eligible';
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
do $$begin
 assert jsonb_array_length(public.study_notebook('shared_all','{}'))=0,'Third user sees shared note';
 assert jsonb_array_length(public.study_notebook('notes','{}'))=0,'Third user sees private notes';
 begin perform public.study_notebook('shared','{"invitation":"00000000-0000-0000-0000-000000000000"}'); raise exception 'Expected denial'; exception when others then if sqlerrm<>'acceptance_required' then raise; end if; end;
 begin perform * from private.study_note_comments; raise exception 'Direct table access allowed'; exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$declare n jsonb;inv jsonb;begin
 inv:=public.study_notebook('invitations','{}')->0;
 n:=public.study_notebook('shared_all','{}')->0;
 perform public.study_notebook('comment',jsonb_build_object('invitation',inv->>'id','note',n->>'id','body','Author reply'));
 assert jsonb_array_length(public.study_notebook('comments',jsonb_build_object('invitation',inv->>'id','note',n->>'id')))=2,'Author cannot reply';
 perform public.study_notebook('leave',jsonb_build_object('invitation',inv->>'id'));
 assert jsonb_array_length(public.study_notebook('shared_all','{}'))=0,'Leaving retains shared access';
 assert jsonb_array_length(public.study_notebook('notes','{}'))=3,'Leaving removed private notes';
end$$;
reset role;
do $$declare n private.activity_notices;begin
 select * into n from private.activity_notices where kind='study_comment' limit 1;
 assert not private.member_push_still_relevant(n.recipient,'activity',n.id),'Revoked note still sends push';
 assert not exists(select 1 from private.study_note_comments),'Leave retained shared comments';
end$$;
select 'Context separation, participant comments, notifications, push eligibility, third-user denial and revocation passed' as result;
rollback;
