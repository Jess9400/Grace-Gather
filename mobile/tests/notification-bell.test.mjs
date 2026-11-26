import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
test('inbox badge lives on the bell, not the profile avatar or account list', () => {
  const bell = read('components/NotificationBell.tsx');
  assert.match(bell, /usePrayerUnread\(\)/);
  assert.match(bell, /unread > 0/);
  assert.match(bell, /unread > 99 \? "99\+" : unread/);
  assert.match(bell, /router\.push\("\/notifications"\)/);
  assert.doesNotMatch(read('components/MemberAvatar.tsx'), /unread|usePrayerUnread/);
  assert.doesNotMatch(read('components/AccountMenuContent.tsx'), /route="\/notifications"/);
  for (const path of ['components/ChurchStrip.tsx', 'components/ScreenNav.tsx', 'components/quiet-ui.tsx', 'app/(tabs)/index.tsx'])
    assert.match(read(path), /<NotificationBell[\s/>]/, path);
});
test('opening the inbox still protects an unsaved page draft', () => {
  assert.match(read('components/ScreenNav.tsx'), /<NotificationBell onPress=\{\(\) => leave\(\(\) => router\.navigate\("\/notifications"\)\)\}/);
});
