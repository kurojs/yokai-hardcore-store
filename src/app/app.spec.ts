import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

/**
 * Specs for the shell.
 *
 * They assert the furniture a visitor needs — landmarks, the two primary links, the demo
 * disclaimer — rather than pixel structure, and they assert the links by their rendered
 * `href`, because that is what proves `routerLink` points at a route that exists.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one main landmark where routed content goes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('main')).toHaveLength(1);
    expect(host.querySelector('main#main router-outlet')).not.toBeNull();
  });

  it('points the primary navigation at the home and catalog routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const hrefs = [...host.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

    expect(hrefs).toEqual(['/', '/catalog']);
    expect(host.querySelector('.brand')?.getAttribute('href')).toBe('/');
  });

  it('offers a skip link to the main landmark', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.skip-link')?.getAttribute('href')).toBe('#main');
  });

  it('keeps the demo disclaimer in the footer, where a buyer can find it', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('footer')?.textContent).toContain('ningún pago se procesa');
  });
});
