import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { PLAYER_STORAGE_KEY } from '../core/player/player-name';
import { PlayerAccount } from './player-account';

/**
 * Specs for the header's player control.
 *
 * The two properties worth pinning are the ones a visual review cannot see: no skin is requested
 * for a visitor who never identified themselves, and a bad username never replaces a good one.
 * The dialog itself is driven through the DOM, the way a visitor drives it.
 */
describe('PlayerAccount', () => {
  beforeEach(async () => {
    localStorage.clear();

    // jsdom ships the `<dialog>` element but not its modal methods. The component treats them
    // as the platform API they are, so the test environment supplies them instead of the
    // component weakening its own code to suit a DOM stub.
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement): void {
      this.removeAttribute('open');
    };

    await TestBed.configureTestingModule({ imports: [PlayerAccount] }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function type(fixture: ComponentFixture<PlayerAccount>, value: string): void {
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector('input') as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(fixture: ComponentFixture<PlayerAccount>): void {
    const host = fixture.nativeElement as HTMLElement;
    const form = host.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows the sign-in button and requests no skin when nobody is signed in', () => {
    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.account--signin')).not.toBeNull();
    expect(host.querySelector('.account--signin')?.textContent).toContain('Iniciar sesión');
    // No `<img>` at all, not an empty `src`: the request must not exist.
    expect(host.querySelector('img')).toBeNull();
  });

  it('renders the Minotar helmet for a stored player, before any interaction', () => {
    localStorage.setItem(PLAYER_STORAGE_KEY, 'Notch');

    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.account--signin')).toBeNull();
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      'https://minotar.net/helm/Notch/64.png',
    );
  });

  it('switches to the avatar after a valid username and remembers it', () => {
    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();

    type(fixture, '  Notch  ');
    submit(fixture);

    const host = fixture.nativeElement as HTMLElement;
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBe('Notch');
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      'https://minotar.net/helm/Notch/64.png',
    );
  });

  it('keeps the dialog open with a message when the username is invalid', () => {
    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();

    type(fixture, 'Steve Smith');
    submit(fixture);

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Solo se permiten letras sin acentos',
    );
    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBeNull();
    expect(host.querySelector('img')).toBeNull();
  });

  it('falls back to the glyph when the skin image fails to load', () => {
    localStorage.setItem(PLAYER_STORAGE_KEY, 'Notch');

    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('.account svg')).not.toBeNull();
  });

  it('forgets the player on sign out', () => {
    localStorage.setItem(PLAYER_STORAGE_KEY, 'Notch');

    const fixture = TestBed.createComponent(PlayerAccount);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    (host.querySelector('.account-dialog__signout') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(localStorage.getItem(PLAYER_STORAGE_KEY)).toBeNull();
    expect(host.querySelector('.account--signin')).not.toBeNull();
  });
});
