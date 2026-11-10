import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../supabase/functions/_shared/christian-stories.js';

test('accepts only deduplicated links to the publisher’s story PDFs', () => {
 const item='<a href="https://christianfaithstories.org/wp-content/uploads/2024/05/example.pdf"><strong>Grace &amp; Hope</strong></a>';
 const attacks='<a href="https://evil.example/wp-content/uploads/2024/05/example.pdf">Fake story</a><a href="https://christianfaithstories.org@evil.example/wp-content/uploads/2024/05/example.pdf">Fake story</a><a href="https://christianfaithstories.org/wp-content/uploads/2024/05/christmas.pdf">Christmas story</a>';
 assert.deepEqual(catalog(item+item+attacks), [{title:'Grace & Hope',url:'https://christianfaithstories.org/wp-content/uploads/2024/05/example.pdf'}]);
});
test('rejects oversized input', () => assert.throws(() => catalog('x'.repeat(2_000_001))));
