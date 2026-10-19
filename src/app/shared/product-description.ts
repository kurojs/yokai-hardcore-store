/**
 * A product description, rendered with its structure intact.
 *
 * Presentational, per `shared/README.md`: one input, no injected singletons, no routing. The
 * interesting work — deciding what counts as an editorial label and where a section ends —
 * lives in `core/catalog/description.ts` as a pure function, and this component only turns the
 * resulting blocks into markup.
 *
 * Why it is not just `<p>{{ description }}</p>`: the real descriptions are 500–1,430 character
 * paragraphs with inline labels (`Cantidad:`, `Efectos Temporales:`), and collapsing them into
 * one block is what makes a product page unreadable. Why the label is `<strong>` rather than a
 * `<dl>`: a description can open with prose before the first label, and several descriptions
 * contain labels that are headings for the sections after them, so a definition list would be a
 * structure the data does not actually have.
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { parseDescription } from '../core/catalog/description';

@Component({
  selector: 'app-product-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="description">
      @for (block of blocks(); track $index) {
        <p class="description__block" [class.description__block--heading]="block.body.length === 0">
          @if (block.label; as label) {
            <strong class="description__label">{{ label }}:</strong>
          }
          @if (block.body) {
            <span class="description__body">{{ ' ' + block.body }}</span>
          }
        </p>
      }
    </div>
  `,
  styles: `
    .description {
      display: grid;
      gap: var(--space-3);
      max-width: 68ch;
    }

    .description__block {
      line-height: 1.7;
      color: var(--color-text-muted);
    }

    .description__label {
      font-weight: 600;
      color: var(--color-text);
    }

    /* A label with no body is a heading for the sections after it. It gets a small mono
       treatment so the hierarchy is visible without turning every label into a heading. */
    .description__block--heading {
      margin-top: var(--space-2);
      color: var(--color-text);
    }

    .description__block--heading .description__label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: var(--color-accent);
    }
  `,
})
export class ProductDescription {
  /** The catalog description, verbatim. Case is never transformed. */
  readonly description = input.required<string>();

  protected readonly blocks = computed(() => parseDescription(this.description()));
}
