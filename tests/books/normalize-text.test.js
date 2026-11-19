import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeText } from '../../src/utils/normalize-text.js';

test('PN-01 trims and collapses whitespace', () => {
  assert.equal(normalizeText('  cien \t años\n de   soledad  '), 'cien anos de soledad');
});

test('PN-02 converts uppercase letters to lowercase', () => {
  assert.equal(normalizeText('LIBRO'), 'libro');
});

test('PN-03 removes accents, diaereses and the tilde on ñ', () => {
  assert.equal(normalizeText('García Márquez Muñoz pingüino'), 'garcia marquez munoz pinguino');
});

test('PN-04 returns empty text for combining marks', () => {
  assert.equal(normalizeText('\u0301\u0308'), '');
});

test('PN-05 is idempotent', () => {
  const normalized = normalizeText('  GARCÍA  MÁRQUEZ  ');
  assert.equal(normalizeText(normalized), normalized);
});

test('PN-06 rejects nonstring input', () => {
  for (const value of [undefined, null, 1, true, [], {}]) {
    assert.throws(() => normalizeText(value), TypeError);
  }
});
