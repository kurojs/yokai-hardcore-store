/**
 * Unit specs for the orthography layer in `scripts/lib/orthography.mjs`.
 *
 * The corpus does not attest an accented spelling for every corrected word, so
 * these specs pin down two things that matter: the corrections land, and the
 * corrections never touch a word they were not meant to touch.
 */

import {
  ACCENT_FIXES,
  findResidualPlainForms,
  RESIDUAL_PLAIN_FORMS,
  restoreAccents,
} from '../../scripts/lib/orthography.mjs';

describe('restoreAccents', () => {
  it('corrects the plain form of Cupón in every case variant', () => {
    expect(restoreAccents('Cupon Es Hora De La Venganza Sangrienta')).toBe(
      'Cupón Es Hora De La Venganza Sangrienta',
    );
    expect(restoreAccents('CUPON CANJEABLE PARA FAMILIAR')).toBe('CUPÓN CANJEABLE PARA FAMILIAR');
    expect(restoreAccents('un cupon mas')).toBe('un cupón mas');
  });

  it('corrects the other real product-name defects', () => {
    expect(restoreAccents('Amuleto del Clerigo')).toBe('Amuleto del Clérigo');
    expect(restoreAccents('Piedra De Fenix')).toBe('Piedra De Fénix');
    expect(restoreAccents('Hongo Ojon')).toBe('Hongo Ojón');
    expect(restoreAccents('Celulas De Kaiyin')).toBe('Células De Kaiyin');
    expect(restoreAccents('Testiculos De Calamar')).toBe('Testículos De Calamar');
  });

  it('corrects the two Armería category names', () => {
    expect(restoreAccents('Armeria De Heroe')).toBe('Armería De Héroe');
    expect(restoreAccents('Armeria de Aventurero')).toBe('Armería de Aventurero');
  });

  it('matches whole words only, so Algodones is never mangled', () => {
    expect(restoreAccents('10 ALGODONES DE AZUCAR')).toBe('10 ALGODONES DE AZUCAR');
    expect(restoreAccents('Algodones de Azucar Goblin')).toBe('Algodones de Azucar Goblin');
  });

  it('leaves words that are already correct in Spanish untouched', () => {
    expect(restoreAccents('Amuleto del Brujo')).toBe('Amuleto del Brujo');
    expect(restoreAccents('Cáliz de Ponce de León')).toBe('Cáliz de Ponce de León');
    expect(restoreAccents('Ojo De Odin')).toBe('Ojo De Odin');
    expect(restoreAccents('Pollo Ricky Ricon')).toBe('Pollo Ricky Ricon');
    expect(restoreAccents('Hongo Ojon es un hongo')).toBe('Hongo Ojón es un hongo');
  });

  it('does not touch seleccionados or selección, which are already correct', () => {
    expect(restoreAccents('paquetes cuidadosamente seleccionados')).toBe(
      'paquetes cuidadosamente seleccionados',
    );
    expect(restoreAccents('nuestra selección exclusiva')).toBe('nuestra selección exclusiva');
  });

  it('does not touch an already-accented form', () => {
    expect(restoreAccents('Cupón Legión De Saqueadores')).toBe('Cupón Legión De Saqueadores');
    expect(restoreAccents('clérigo')).toBe('clérigo');
  });

  it('is idempotent', () => {
    const source = 'Cupon del Clerigo, Fenix y Ojon en la Armeria';
    const once = restoreAccents(source);
    expect(restoreAccents(once)).toBe(once);
    expect(once).toBe('Cupón del Clérigo, Fénix y Ojón en la Armería');
  });

  it('preserves the casing style of the surrounding copy', () => {
    expect(restoreAccents('ARMERIA DE HEROE')).toBe('ARMERÍA DE HÉROE');
    expect(restoreAccents('armeria de heroe')).toBe('armería de héroe');
  });

  it('corrects every occurrence in a paragraph, not only the first', () => {
    expect(restoreAccents('Cupon y otro Cupon y un tercer CUPON')).toBe(
      'Cupón y otro Cupón y un tercer CUPÓN',
    );
  });
});

describe('residual plain form gate', () => {
  it('reports nothing after a correction', () => {
    for (const fix of ACCENT_FIXES) {
      expect(findResidualPlainForms(restoreAccents(fix.from))).toEqual([]);
    }
  });

  it('detects a residual plain form that was not corrected', () => {
    expect(findResidualPlainForms('Cupon')).toEqual([{ form: 'Cupon', count: 1 }]);
  });

  it('counts every occurrence', () => {
    expect(findResidualPlainForms('Fenix Fenix')).toEqual([{ form: 'Fenix', count: 2 }]);
  });

  it('ignores a plain form embedded inside a longer word', () => {
    expect(findResidualPlainForms('Algodones')).toEqual([]);
  });

  it('exposes one gate entry per case variant', () => {
    expect(RESIDUAL_PLAIN_FORMS).toContain('Cupon');
    expect(RESIDUAL_PLAIN_FORMS).toContain('CUPON');
    expect(RESIDUAL_PLAIN_FORMS).toContain('cupon');
  });

  it('never maps a word onto itself', () => {
    for (const fix of ACCENT_FIXES) {
      expect(fix.to).not.toBe(fix.from);
    }
  });

  it('holds an evidence note for every correction', () => {
    for (const fix of ACCENT_FIXES) {
      expect(typeof fix.evidence).toBe('string');
      expect(fix.evidence.length).toBeGreaterThan(0);
    }
  });
});
