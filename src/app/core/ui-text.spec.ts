import {
  addedToCartMessage,
  cartCountLabel,
  itemCountLabel,
  productCountLabel,
  relatedProductsTitle,
} from './ui-text';

describe('productCountLabel', () => {
  it('uses the singular for exactly one product', () => {
    expect(productCountLabel(1)).toBe('1 producto');
  });

  it('uses the plural for the counts the catalog actually produces', () => {
    // The real categories hold 2, 4, 5, 8, 9, 12, 13 and 17 products; the whole catalog 48.
    expect(productCountLabel(0)).toBe('0 productos');
    expect(productCountLabel(2)).toBe('2 productos');
    expect(productCountLabel(13)).toBe('13 productos');
    expect(productCountLabel(48)).toBe('48 productos');
  });

  it('clamps a nonsensical count instead of showing it', () => {
    // Defensive only: the count always comes from a rendered list, so a fractional or
    // negative value means the caller is wrong, not that the customer should read "-0.5".
    expect(productCountLabel(-3)).toBe('0 productos');
    expect(productCountLabel(2.9)).toBe('2 productos');
    expect(productCountLabel(Number.NaN)).toBe('');
  });
});

describe('itemCountLabel', () => {
  it('pluralises the cart unit', () => {
    expect(itemCountLabel(0)).toBe('0 artículos');
    expect(itemCountLabel(1)).toBe('1 artículo');
    expect(itemCountLabel(3)).toBe('3 artículos');
  });

  it('floors and clamps like the product count', () => {
    expect(itemCountLabel(-1)).toBe('0 artículos');
    expect(itemCountLabel(2.9)).toBe('2 artículos');
    expect(itemCountLabel(Number.NaN)).toBe('');
  });
});

describe('cartCountLabel', () => {
  it('says the cart is empty rather than showing a bare zero', () => {
    expect(cartCountLabel(0)).toBe('Carrito vacío');
  });

  it('names the unit count once there is something in it', () => {
    expect(cartCountLabel(1)).toBe('Carrito: 1 artículo');
    expect(cartCountLabel(5)).toBe('Carrito: 5 artículos');
  });

  it('degrades an unusable count to the bare label', () => {
    expect(cartCountLabel(Number.NaN)).toBe('Carrito');
  });
});

describe('addedToCartMessage', () => {
  it('repeats the new count so a second addition announces something different', () => {
    const product = '10 ALGODONES DE AZUCAR';

    expect(addedToCartMessage(product, 1)).toBe(
      'Añadido al carrito: 10 ALGODONES DE AZUCAR. 1 artículo en el carrito.',
    );
    expect(addedToCartMessage(product, 2)).toBe(
      'Añadido al carrito: 10 ALGODONES DE AZUCAR. 2 artículos en el carrito.',
    );
  });

  it('never transforms the product name', () => {
    expect(addedToCartMessage('CUPÓN CANJEABLE PARA FAMILIAR', 1)).toContain(
      'CUPÓN CANJEABLE PARA FAMILIAR',
    );
  });
});

describe('relatedProductsTitle', () => {
  it('names the category the strip stays inside', () => {
    expect(relatedProductsTitle('Mascotas')).toBe('Más de Mascotas');
  });
});
