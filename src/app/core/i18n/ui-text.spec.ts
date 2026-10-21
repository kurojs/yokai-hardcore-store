/**
 * Specs for the dictionary: parity, translation coverage, pluralisation and interpolation.
 *
 * Three properties are worth more than any individual string:
 *
 * 1. **Parity.** The `UiText` type already makes a missing key a compile error; this spec proves
 *    the runtime objects actually match, so a future refactor that drops the annotation still
 *    fails here instead of at the first Japanese render.
 * 2. **No leakage.** A heuristic asserts that no English or Japanese value is merely the Spanish
 *    value again, after removing tokens that are *supposed* to be identical: the brand names,
 *    catalog names, digits and punctuation.
 * 3. **Grammar.** Plural boundaries are pinned explicitly at 0, 1, 2, 5, 11 and 99 for each
 *    language, because "1 products" and a Japanese plural are exactly the mistakes a
 *    one-shape-fits-all string table produces.
 */

import type { MinecraftUsernameProblem } from '../checkout/username';
import { LANGUAGES } from './language';
import { UI_TEXT, uiText, type UiText } from './ui-text';
import { ES_UI_TEXT } from './dictionaries/es';

const COUNT_BOUNDARIES = [0, 1, 2, 5, 11, 99] as const;

/**
 * Sample arguments for every function-valued key.
 *
 * The completeness test below fails when a function is added without an entry here, so a new
 * interpolating string cannot silently skip the leak check.
 */
const PROBE_ARGS: Readonly<Record<string, readonly (readonly unknown[])[]>> = {
  productCountLabel: COUNT_BOUNDARIES.map((count) => [count]),
  itemCountLabel: COUNT_BOUNDARIES.map((count) => [count]),
  cartCountLabel: COUNT_BOUNDARIES.map((count) => [count]),
  languageChanged: [['日本語']],
  relatedProductsTitle: [['RESUCITACIÓN']],
  upToPrice: [['$5.00']],
  addedToCartMessage: COUNT_BOUNDARIES.map((count) => ['CUPÓN CANJEABLE PARA FAMILIAR', count]),
  cartLineQuantityLabel: [['CUPÓN CANJEABLE PARA FAMILIAR']],
  cartLineIncreaseLabel: [['CUPÓN CANJEABLE PARA FAMILIAR']],
  cartLineDecreaseLabel: [['CUPÓN CANJEABLE PARA FAMILIAR']],
  cartRemoveLabel: [['CUPÓN CANJEABLE PARA FAMILIAR']],
  usernameProblemMessage: [
    ['empty'],
    ['too-short'],
    ['too-long'],
    ['illegal-characters'],
  ] satisfies readonly MinecraftUsernameProblem[][],
};

/**
 * Keys whose value is legitimately the same in Spanish and English.
 *
 * `Subtotal` and `Total` are loanwords with identical spelling in both languages. They are listed
 * rather than silently skipped, so the allow-list stays explicit and reviewable.
 */
const IDENTICAL_BY_DESIGN: ReadonlySet<keyof UiText> = new Set<keyof UiText>([
  'orderSummarySubtotalLabel',
  'orderSummaryTotalLabel',
  'footerBrand',
]);

/**
 * Tokens that are meant to survive translation unchanged.
 *
 * Proper nouns (`Yokai Hardcore Store`, `Yokai Hardcore`, `Minecraft`), digits and punctuation
 * are removed before comparing, so `商品48点` and `48 productos` are compared on what is actually
 * translated. Japanese full-width punctuation is `\p{P}`, so one Unicode class covers both.
 */
const SHARED_TOKENS: readonly RegExp[] = [
  /Yokai Hardcore Store/gu,
  /Yokai Hardcore/gu,
  /Minecraft/gu,
  /\d+/gu,
];

function residual(value: string): string {
  return SHARED_TOKENS.reduce((text, pattern) => text.replace(pattern, ''), value)
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .trim();
}

function callText(text: UiText, key: keyof UiText, args: readonly unknown[]): string {
  const value = text[key];
  if (typeof value === 'string') return value;
  return (value as (...parameters: unknown[]) => string)(...args);
}

function argsFor(key: keyof UiText): readonly (readonly unknown[])[] {
  return PROBE_ARGS[key] ?? [[]];
}

const KEYS = Object.keys(ES_UI_TEXT) as (keyof UiText)[];

describe('dictionary shape', () => {
  it('has exactly the same keys in every language', () => {
    const spanishKeys = [...KEYS].sort();

    for (const language of LANGUAGES) {
      expect(Object.keys(UI_TEXT[language]).sort()).toEqual(spanishKeys);
    }
  });

  it('has the same kind of value for every key, so a function never degrades to a string', () => {
    for (const language of LANGUAGES) {
      for (const key of KEYS) {
        expect(typeof UI_TEXT[language][key]).toBe(typeof ES_UI_TEXT[key]);
      }
    }
  });

  it('has probe arguments for every function-valued key', () => {
    const functionKeys = KEYS.filter((key) => typeof ES_UI_TEXT[key] === 'function').sort();

    expect(Object.keys(PROBE_ARGS).sort()).toEqual(functionKeys);
  });

  it('selects the dictionary by language', () => {
    expect(uiText('es')).toBe(UI_TEXT.es);
    expect(uiText('en')).toBe(UI_TEXT.en);
    expect(uiText('ja')).toBe(UI_TEXT.ja);
  });

  it('has no empty string, which would render as a missing label', () => {
    const failures: string[] = [];

    for (const language of LANGUAGES) {
      for (const key of KEYS) {
        for (const args of argsFor(key)) {
          if (callText(UI_TEXT[language], key, args) === '') {
            failures.push(`${language}.${key}(${args.map(String).join(',')})`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

describe('translation coverage', () => {
  it('does not leave English or Japanese identical to Spanish once shared tokens are removed', () => {
    const failures: string[] = [];

    for (const key of KEYS) {
      if (IDENTICAL_BY_DESIGN.has(key)) continue;

      for (const args of argsFor(key)) {
        const spanish = residual(callText(ES_UI_TEXT, key, args));
        if (spanish === '') continue;

        for (const language of ['en', 'ja'] as const) {
          const translated = callText(UI_TEXT[language], key, args);
          if (residual(translated) === spanish) {
            failures.push(`${language}.${key}(${args.map(String).join(',')}) = "${translated}"`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps digits and proper nouns verbatim in every language', () => {
    for (const language of LANGUAGES) {
      const text = uiText(language);

      expect(text.productCountLabel(99)).toContain('99');
      expect(text.productCountLabel(99)).not.toContain('Minecraft');
      expect(text.addedToCartMessage('Minecraft', 1)).toContain('Minecraft');
      expect(text.addedToCartMessage('Yokai Hardcore', 1)).toContain('Yokai Hardcore');
    }
  });
});

describe('count labels at the boundaries', () => {
  const PRODUCT: Readonly<Record<string, readonly string[]>> = {
    es: ['0 productos', '1 producto', '2 productos', '5 productos', '11 productos', '99 productos'],
    en: ['0 products', '1 product', '2 products', '5 products', '11 products', '99 products'],
    ja: ['0点', '1点', '2点', '5点', '11点', '99点'],
  };

  const ITEM: Readonly<Record<string, readonly string[]>> = {
    es: ['0 artículos', '1 artículo', '2 artículos', '5 artículos', '11 artículos', '99 artículos'],
    en: ['0 items', '1 item', '2 items', '5 items', '11 items', '99 items'],
    ja: ['0点', '1点', '2点', '5点', '11点', '99点'],
  };

  const CART: Readonly<Record<string, readonly string[]>> = {
    es: [
      'Carrito vacío',
      'Carrito: 1 artículo',
      'Carrito: 2 artículos',
      'Carrito: 5 artículos',
      'Carrito: 11 artículos',
      'Carrito: 99 artículos',
    ],
    en: [
      'Cart is empty',
      'Cart: 1 item',
      'Cart: 2 items',
      'Cart: 5 items',
      'Cart: 11 items',
      'Cart: 99 items',
    ],
    ja: ['カートは空です', 'カート: 1点', 'カート: 2点', 'カート: 5点', 'カート: 11点', 'カート: 99点'],
  };

  it.each(LANGUAGES)('pluralises products in %s', (language) => {
    expect(COUNT_BOUNDARIES.map((count) => uiText(language).productCountLabel(count))).toEqual(
      PRODUCT[language],
    );
  });

  it.each(LANGUAGES)('pluralises cart units in %s', (language) => {
    expect(COUNT_BOUNDARIES.map((count) => uiText(language).itemCountLabel(count))).toEqual(
      ITEM[language],
    );
  });

  it.each(LANGUAGES)('summarises the cart indicator in %s', (language) => {
    expect(COUNT_BOUNDARIES.map((count) => uiText(language).cartCountLabel(count))).toEqual(
      CART[language],
    );
  });

  it('floors and clamps unusable counts in every language', () => {
    for (const language of LANGUAGES) {
      const text = uiText(language);

      expect(text.productCountLabel(-3)).toBe(text.productCountLabel(0));
      expect(text.productCountLabel(2.9)).toBe(text.productCountLabel(2));
      expect(text.productCountLabel(Number.NaN)).toBe('');
      expect(text.itemCountLabel(-1)).toBe(text.itemCountLabel(0));
      expect(text.itemCountLabel(2.9)).toBe(text.itemCountLabel(2));
      expect(text.itemCountLabel(Number.NaN)).toBe('');
    }

    expect(uiText('es').cartCountLabel(Number.NaN)).toBe('Carrito');
    expect(uiText('en').cartCountLabel(Number.NaN)).toBe('Cart');
    expect(uiText('ja').cartCountLabel(Number.NaN)).toBe('カート');
  });
});

describe('interpolation', () => {
  const PRODUCT_NAME = 'CUPÓN CANJEABLE PARA FAMILIAR';
  const CATEGORY_NAME = 'RESUCITACIÓN';

  it.each(LANGUAGES)('preserves the product name byte for byte in %s', (language) => {
    const text = uiText(language);

    expect(text.addedToCartMessage(PRODUCT_NAME, 2)).toContain(PRODUCT_NAME);
    expect(text.cartLineQuantityLabel(PRODUCT_NAME)).toContain(PRODUCT_NAME);
    expect(text.cartLineIncreaseLabel(PRODUCT_NAME)).toContain(PRODUCT_NAME);
    expect(text.cartLineDecreaseLabel(PRODUCT_NAME)).toContain(PRODUCT_NAME);
    expect(text.cartRemoveLabel(PRODUCT_NAME)).toContain(PRODUCT_NAME);
  });

  it.each(LANGUAGES)('preserves the category name and the price in %s', (language) => {
    const text = uiText(language);

    expect(text.relatedProductsTitle(CATEGORY_NAME)).toContain(CATEGORY_NAME);
    expect(text.upToPrice('$5.00')).toContain('$5.00');
  });

  it('never changes the casing of an ALL CAPS catalog name', () => {
    for (const language of LANGUAGES) {
      expect(uiText(language).addedToCartMessage('10 ALGODONES DE AZUCAR', 1)).toContain(
        '10 ALGODONES DE AZUCAR',
      );
    }
  });
});

describe('validation messages', () => {
  const PROBLEMS: readonly MinecraftUsernameProblem[] = [
    'empty',
    'too-short',
    'too-long',
    'illegal-characters',
  ];

  it('gives every problem a distinct sentence in every language', () => {
    for (const language of LANGUAGES) {
      const messages = PROBLEMS.map((problem) =>
        uiText(language).usernameProblemMessage(problem),
      );
      expect(new Set(messages).size).toBe(PROBLEMS.length);
      expect(messages.every((message) => message.length > 0)).toBe(true);
    }
  });
});
