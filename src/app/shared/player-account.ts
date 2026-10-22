/**
 * The header's player control: a skin avatar when a Minecraft username is known, a sign-in
 * button when it is not.
 *
 * The distinction that shapes this component: **there is no account system**, so "sign in" here
 * means "tell the store which player you are". The dialog therefore asks for a username, not a
 * password, says what the name is used for, and names the third party that serves the skin
 * image. Calling it authentication would be a lie the rest of the application cannot back up.
 *
 * Two rendering rules keep it honest:
 *
 * - No username means **no `<img>` at all**, so the storefront issues no Minotar request for a
 *   visitor who never identified themselves.
 * - A failed avatar load falls back to the generic glyph instead of a broken image, because a
 *   broken avatar reads as a bug in the store rather than as a skin that could not be fetched.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, type ElementRef } from '@angular/core';

import { validateMinecraftUsername, type MinecraftUsernameProblem } from '../core/checkout/username';
import { LanguageStore } from '../core/i18n/language-store';
import { PlayerStore } from '../core/player/player-store';

@Component({
  selector: 'app-player-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (player.isSignedIn()) {
      <button
        class="account"
        type="button"
        (click)="open()"
        [attr.aria-label]="text().accountOpenLabel(player.playerName() ?? '')"
      >
        @if (showAvatar()) {
          <img
            class="account__avatar"
            [src]="player.avatarUrl()"
            alt=""
            width="32"
            height="32"
            (error)="onAvatarError()"
          />
        } @else {          <svg
            class="icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
          </svg>
        }
      </button>
    } @else {
      <button class="account account--signin" type="button" (click)="open()">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
        <span class="account__label">{{ text().signInLabel }}</span>
      </button>
    }

    <dialog #dialog class="account-dialog" aria-labelledby="account-dialog-title">
      <form class="account-dialog__form" novalidate (submit)="onSubmit($event)">
        <h2 class="account-dialog__title" id="account-dialog-title">
          {{ text().accountDialogTitle }}
        </h2>

        <label class="account-dialog__label" for="account-player-name">
          {{ text().accountNameLabel }}
        </label>
        <input
          #nameInput
          class="account-dialog__input"
          id="account-player-name"
          name="playerName"
          type="text"
          autocomplete="username"
          autocapitalize="off"
          spellcheck="false"
          autofocus
          [value]="draft()"
          [attr.aria-invalid]="error() !== null"
          [attr.aria-describedby]="error() !== null ? 'account-player-name-error' : null"
          (input)="onDraftInput($event)"
        />

        @if (error(); as problem) {
          <p class="account-dialog__error" id="account-player-name-error" role="alert">
            {{ text().usernameProblemMessage(problem) }}
          </p>
        }

        <div class="account-dialog__actions">
          <button class="account-dialog__button" type="button" (click)="close()">
            {{ text().accountCancelLabel }}
          </button>
          <button
            class="account-dialog__button account-dialog__button--primary"
            type="submit"
          >
            {{ text().accountSaveLabel }}
          </button>
        </div>

        @if (player.isSignedIn()) {
          <button class="account-dialog__signout" type="button" (click)="signOut()">
            {{ text().accountSignOutLabel }}
          </button>
        }
      </form>
    </dialog>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }

    .account {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: 0.25rem;
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--text-ui);
      font-weight: 600;
      cursor: pointer;
      transition:
        color var(--transition),
        background var(--transition),
        border-color var(--transition);
    }

    .account:hover {
      border-color: var(--glass-border);
      background: var(--glass-bg);
      color: var(--color-text);
    }

    .account--signin {
      padding: 0.45rem var(--space-3);
      border-color: var(--color-border-control);
      border-radius: var(--radius-sm);
      color: var(--color-text);
    }

    .account--signin:hover {
      border-color: var(--color-accent);
      background: var(--glass-bg-strong);
    }

    /* The avatar is the button's only visible content, so it carries the size and the ring. */
    .account__avatar {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-pill);
      background: var(--glass-bg-strong);
      object-fit: cover;
      image-rendering: pixelated;
    }

    .icon {
      display: block;
      flex: none;
      color: currentColor;
    }

    .account-dialog {
      width: min(26rem, calc(100vw - 2rem));
      padding: 0;
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      color: var(--color-text);
      box-shadow: var(--shadow-card);
    }

    /* The backdrop is the one place the page dims: a modal that leaves the storefront at full
       contrast competes with its own dialog. */
    .account-dialog::backdrop {
      background: rgb(3 3 5 / 0.72);
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }

    .account-dialog__form {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-5);
    }

    .account-dialog__title {
      font-size: 1.375rem;
    }

    .account-dialog__label {
      font-size: var(--text-small);
      font-weight: 700;
    }

    .account-dialog__input {
      width: 100%;
      padding: 0.6rem var(--space-3);
      border: 1px solid var(--color-border-control);
      border-radius: var(--radius-sm);
      background: var(--field-bg);
      color: var(--color-text);
      font: inherit;
      font-size: var(--text-base);
    }

    .account-dialog__input:focus-visible {
      border-color: var(--color-accent);
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .account-dialog__error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-small);
    }

    .account-dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding-top: var(--space-2);
    }

    .account-dialog__button {
      padding: 0.5rem var(--space-4);
      border: 1px solid var(--color-border-control);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: var(--text-ui);
      font-weight: 600;
      cursor: pointer;
      transition:
        border-color var(--transition),
        background var(--transition);
    }

    .account-dialog__button:hover {
      border-color: var(--color-text-muted);
      background: var(--glass-bg);
    }

    .account-dialog__button--primary {
      border-color: transparent;
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    .account-dialog__button--primary:hover {
      background: var(--color-accent-hover);
    }

    .account-dialog__signout {
      justify-self: start;
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--text-small);
      text-decoration: underline;
      text-underline-offset: 0.2em;
      cursor: pointer;
    }

    .account-dialog__signout:hover {
      color: var(--color-danger);
    }

    /* At phone width the label is the first thing to go: the glyph keeps the control, and the
       accessible name keeps its meaning. */
    @media (max-width: 40rem) {
      .account--signin {
        padding-inline: 0.5rem;
      }

      .account__label {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    }
  `,
})
export class PlayerAccount {
  private readonly language = inject(LanguageStore);
  protected readonly player = inject(PlayerStore);

  protected readonly text = this.language.text;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  /** What the input holds while the dialog is open. Never the store's value directly. */
  protected readonly draft = signal('');

  /** The first failed rule, or `null`. */
  protected readonly error = signal<MinecraftUsernameProblem | null>(null);

  /** Set when Minotar could not serve the skin, so the glyph replaces a broken image. */
  private readonly imageFailed = signal(false);

  /**
   * Whether the avatar can be drawn. A known username is not enough: the request may have
   * failed, and a broken image would claim the skin exists.
   */
  protected readonly showAvatar = computed(
    () => this.player.avatarUrl() !== null && !this.imageFailed(),
  );

  protected open(): void {
    this.draft.set(this.player.playerName() ?? '');
    this.error.set(null);
    this.imageFailed.set(false);

    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();

    // `autofocus` covers the first open; an explicit focus covers every reopen, where the
    // browser may restore focus to the trigger instead.
    this.nameInput().nativeElement.focus();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    if (this.error() !== null) this.error.set(null);
  }

  protected onAvatarError(): void {
    this.imageFailed.set(true);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const result = validateMinecraftUsername(this.draft());
    if (!result.ok) {
      this.error.set(result.problem);
      this.nameInput().nativeElement.focus();
      return;
    }

    this.player.signIn(result.value);
    // A new username deserves a fresh attempt even if the previous skin failed to load.
    this.imageFailed.set(false);
    this.close();
  }

  protected signOut(): void {
    this.player.signOut();
    this.imageFailed.set(false);
    this.close();
  }
}
