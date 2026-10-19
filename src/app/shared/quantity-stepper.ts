/**
 * A quantity stepper: "−  2  +", with the bounds enforced by the control itself.
 *
 * Presentational, per `shared/README.md`: a value in, a new value out, no cart, no store and no
 * routing. The product page decides what a new quantity means (today: the selection before the
 * visitor adds it), and a future cart row can use the same control to change a line's quantity.
 *
 * Bounds rather than free text on purpose: a number input accepts `e`, `-0.5` and an empty
 * string, and every one of those has to be repaired somewhere. A stepper cannot produce them, so
 * the cart never has to defend against what this control emits. The buttons are `disabled` at
 * the bounds, which is also the only state a keyboard or screen-reader user can perceive.
 */

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { MAX_LINE_QUANTITY } from '../core/cart/cart-model';
import {
  DECREASE_QUANTITY_LABEL,
  INCREASE_QUANTITY_LABEL,
  QUANTITY_LABEL,
} from '../core/ui-text';

@Component({
  selector: 'app-quantity-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper" role="group" [attr.aria-label]="label()">
      <button
        type="button"
        class="stepper__button"
        [attr.aria-label]="decreaseLabel()"
        [disabled]="current() <= floor()"
        (click)="step(-1)"
      >
        −
      </button>
      <span class="stepper__value">{{ current() }}</span>
      <button
        type="button"
        class="stepper__button"
        [attr.aria-label]="increaseLabel()"
        [disabled]="current() >= ceiling()"
        (click)="step(1)"
      >
        +
      </button>
    </div>
  `,
  styles: `
    .stepper {
      display: inline-flex;
      align-items: stretch;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
    }

    .stepper__button {
      width: 2.5rem;
      border: 0;
      background: none;
      color: var(--color-text);
      font: inherit;
      font-size: 1.125rem;
      cursor: pointer;
      transition: background var(--transition);
    }

    .stepper__button:hover:not(:disabled) {
      background: var(--color-surface-raised);
    }

    .stepper__button:disabled {
      color: var(--color-border-strong);
      cursor: not-allowed;
    }

    .stepper__value {
      display: grid;
      place-items: center;
      min-width: 2.5rem;
      border-inline: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 0.9375rem;
    }
  `,
})
export class QuantityStepper {
  /** The current quantity. */
  readonly value = input.required<number>();

  /** Lowest selectable quantity. One, because zero is "remove", not "select none". */
  readonly min = input<number>(1);

  /** Highest selectable quantity. Shared with the cart so the two cannot disagree. */
  readonly max = input<number>(MAX_LINE_QUANTITY);

  readonly label = input<string>(QUANTITY_LABEL);
  readonly decreaseLabel = input<string>(DECREASE_QUANTITY_LABEL);
  readonly increaseLabel = input<string>(INCREASE_QUANTITY_LABEL);

  /** The new quantity, emitted only when it actually changed. */
  readonly valueChange = output<number>();

  /** The value as the control can use it: always an integer inside the range. */
  protected readonly current = computed(() => {
    const { floor, ceiling } = this.bounds();
    const value = this.value();
    if (!Number.isFinite(value)) return floor;
    return Math.min(Math.max(Math.trunc(value), floor), ceiling);
  });

  /** The lower bound, normalised. */
  protected readonly floor = computed(() => this.bounds().floor);

  /** The upper bound, normalised. */
  protected readonly ceiling = computed(() => this.bounds().ceiling);

  protected step(delta: number): void {
    const { floor, ceiling } = this.bounds();
    const next = Math.min(Math.max(this.current() + delta, floor), ceiling);
    if (next === this.current()) return;
    this.valueChange.emit(next);
  }

  /**
   * The legal range, folded defensively.
   *
   * A non-finite or inverted pair still yields a usable range (`min` wins, never below one), so
   * a binding mistake produces a control the visitor can operate instead of a `NaN` quantity the
   * cart would have to repair.
   */
  private bounds(): { readonly floor: number; readonly ceiling: number } {
    const min = Number.isFinite(this.min()) ? Math.trunc(this.min()) : 1;
    const max = Number.isFinite(this.max()) ? Math.trunc(this.max()) : MAX_LINE_QUANTITY;
    const floor = Math.max(1, Math.min(min, max));
    return { floor, ceiling: Math.max(floor, max) };
  }
}
