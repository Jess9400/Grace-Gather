import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const header = `-- Private source pool and publication log. RLS is defense in depth.\ncreate table private.portuguese_bible_story_pool (ordinal integer primary key, data jsonb not null, published_on date unique);\nalter table private.portuguese_bible_story_pool enable row level security;\nrevoke all on private.portuguese_bible_story_pool from public, anon, authenticated;\ncreate table private.portuguese_story_releases (published_on date primary key, item_id text not null, published_at timestamptz not null);\nalter table private.portuguese_story_releases enable row level security;\nrevoke all on private.portuguese_story_releases from public, anon, authenticated;\n`;
const read = (path) => readFileSync(resolve(root, path), "utf8");
writeFileSync(resolve(root, "supabase/migrations/20261113202222_portuguese_bible_story_pool.sql"), header + read("supabase/seeds/brazilian_bible_stories.generated.sql") + "\n" + read("supabase/seeds/portuguese_bible_publisher.sql"));
