import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeText } from '../../src/utils/normalize-text.js';

describe('normalizeText (PN-01 a PN-06)', () => {
  it('PN-01: recorta espacios y colapsa los internos', () => {
    assert.equal(normalizeText('  Cien   años \t de  soledad  '), 'cien anos de soledad');
  });

  it('PN-02: pasa mayúsculas a minúsculas', () => {
    assert.equal(normalizeText('EL PRINCIPITO'), 'el principito');
  });

  it('PN-03: elimina tildes, diéresis y la tilde de la ñ', () => {
    assert.equal(normalizeText('García'), 'garcia');
    assert.equal(normalizeText('Márquez'), 'marquez');
    assert.equal(normalizeText('Muñoz'), 'munoz');
    assert.equal(normalizeText('Pingüino'), 'pinguino');
  });

  it('PN-04: un texto solo de marcas diacríticas da cadena vacía', () => {
    assert.equal(normalizeText('\u0301\u0308'), '');
    assert.equal(normalizeText('  \u0301  '), '');
    assert.equal(normalizeText('   '), '');
  });

  it('PN-05: es idempotente', () => {
    for (const text of ['  GARCÍA   Márquez ', 'a \u0301 b', 'İstanbul', 'Ñandú']) {
      const once = normalizeText(text);
      assert.equal(normalizeText(once), once);
    }
  });

  it('PN-06: una entrada que no es texto produce error', () => {
    for (const value of [undefined, null, 42, {}, ['a']]) {
      assert.throws(() => normalizeText(value), TypeError);
    }
  });
});