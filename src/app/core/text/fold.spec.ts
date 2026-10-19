import { foldForSearch } from './fold';

describe('foldForSearch', () => {
  it('strips the diacritics that actually occur in this catalog', () => {
    // Measured over all 48 products and 10 categories: exactly these 11 non-ASCII glyphs
    // occur. Asserting all of them keeps this helper pinned to the real data rather than
    // to a guess about which accents matter.
    expect(foldForSearch('¡¿ÉÍÓáéíñóú')).toBe('¡¿eioaeinou');
  });

  it('folds both directions of the catalog inconsistency', () => {
    // `Azúcar` (description) and `AZUCAR` (name) are the same word in the data.
    expect(foldForSearch('Azúcar')).toBe(foldForSearch('AZUCAR'));
    expect(foldForSearch('Armería De Héroe')).toBe(foldForSearch('Armeria De Heroe'));
    expect(foldForSearch('Células De Kaiyin')).toBe(foldForSearch('CELULAS DE KAIYIN'));
    expect(foldForSearch('Testículos De Calamar')).toBe('testiculos de calamar');
  });

  it('folds the letters Spanish uses that NFD also covers', () => {
    expect(foldForSearch('pingüino')).toBe('pinguino');
    expect(foldForSearch('çedilla')).toBe('cedilla');
    expect(foldForSearch('à è ì ò ù')).toBe('a e i o u');
  });

  it('leaves punctuation and the inverted Spanish marks alone', () => {
    // `¡` and `¿` are not diacritics and are not removed: they are also not word
    // boundaries for a substring search, so a query typed without them still matches.
    expect(foldForSearch('¡Aliméntate!')).toBe('¡alimentate!');
    expect(foldForSearch('¿Buscas venganza?')).toBe('¿buscas venganza?');
  });

  it('is idempotent and never mutates its input implicitly', () => {
    const input = 'CUPÓN Legión';
    expect(foldForSearch(foldForSearch(input))).toBe(foldForSearch(input));
    expect(input).toBe('CUPÓN Legión');
  });

  it('passes through text without letters unchanged', () => {
    expect(foldForSearch('')).toBe('');
    expect(foldForSearch('5000')).toBe('5000');
  });
});
