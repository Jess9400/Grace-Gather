import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteConfirmationWord } from '../src/lib/delete-confirmation.ts';

test('destructive actions require a clear word in the selected language', () => {
  assert.equal(deleteConfirmationWord('en'), 'DELETE');
  assert.equal(deleteConfirmationWord('pt'), 'EXCLUIR');
  assert.equal(deleteConfirmationWord('es'), 'BORRAR');
  assert.equal(deleteConfirmationWord('ru'), 'УДАЛИТЬ');
});
