/**
 * The landing page: a hero, then the catalog's categories and a featured spread.
 *
 * It is the slice's only container, and its whole job is to read the shared catalog store and
 * hand plain values to `shared/` cards. The pieces of behaviour worth naming:
 *
 * - The featured selection is not "the first four products". `selectFeatured` spreads it across
 *   categories, and it is a pure function in its own module so the rule is tested without a
 *   TestBed.
 * - The page has three states, and all three are real: loading while `/data/catalog.json` is in
 *   flight, an error with a retry action when the fetch or the validation fails, and the content
 *   itself. A catalog page that renders an empty grid on failure would look like a store with
 *   nothing to sell.
 * - Copy comes from `LanguageStore.text`, and the document title follows it. The category names
 *   and product names it renders are catalog data and are never translated.
 * - The decorative 3D scene is an optional enhancement: it is imported dynamically after the
 *   first render, so the hero is complete before three.js is even requested.
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { CatalogStore } from '../../core/catalog/catalog-store';
import { categoryFallbackImage } from '../../core/catalog/category-visual';
import { LanguageStore } from '../../core/i18n/language-store';
import { CategoryCard } from '../../shared/category-card';
import { ProductCard } from '../../shared/product-card';
import { RevealOnScroll } from '../../shared/reveal-on-scroll';
import { FEATURED_COUNT, selectFeatured } from './featured';

/** One quiet line if the scene's chunk cannot be fetched; never an error box. */
let sceneLoadFailureReported = false;

function reportSceneLoadFailure(cause: unknown): void {
  if (sceneLoadFailureReported) return;
  sceneLoadFailureReported = true;
  console.warn(
    `landing scene: could not load its module: ${cause instanceof Error ? cause.message : String(cause)}`,
  );
}

@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CategoryCard, ProductCard, RevealOnScroll],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnDestroy {
  private readonly catalog = inject(CatalogStore);
  private readonly i18n = inject(LanguageStore);
  private readonly documentTitle = inject(Title);

  private readonly sceneAnchor = viewChild.required('sceneAnchor', { read: ViewContainerRef });
  private sceneStarted = false;
  private destroyed = false;

  protected readonly text = this.i18n.text;

  protected readonly isLoading = this.catalog.isLoading;
  protected readonly isReady = this.catalog.isReady;
  protected readonly errorMessage = this.catalog.errorMessage;

  /**
   * The categories in browse order, biggest first.
   *
   * The landing strip is the first browse surface a visitor sees, so it uses the same order as
   * the catalog instead of the JSON's authoring order: the categories that actually hold stock
   * lead, and the four single-product ones stop interrupting the grid.
   */
  protected readonly categories = this.catalog.orderedCategories;
  protected readonly featured = computed(() =>
    selectFeatured(this.catalog.entries(), FEATURED_COUNT),
  );

  private readonly productCount = computed(() => this.catalog.entries().length);
  protected readonly countLabel = computed(() =>
    this.text().productCountLabel(this.productCount()),
  );
  protected readonly categoryCount = computed(() => this.catalog.categories().length);

  /**
   * A product photograph per category, used only by cards whose category ships no banner.
   * Computed once per catalog change so the fallback scan does not run on every keystroke
   * elsewhere in the page.
   */
  private readonly fallbackImages = computed(() => {
    const images = new Map<string, string | null>();
    const entries = this.catalog.entries();
    for (const category of this.catalog.categories()) {
      images.set(category.id, categoryFallbackImage(entries, category.id));
    }
    return images;
  });

  constructor() {
    effect(() => this.documentTitle.setTitle(this.text().homeDocumentTitle));

    // The scene is fetched only after the landing content has rendered, and only through a
    // dynamic import: `three` and every scene module stay out of the home page's chunk and
    // out of the initial bundle. A failed chunk fetch leaves the static hero untouched.
    afterNextRender(() => {
      void this.loadLandingScene();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private async loadLandingScene(): Promise<void> {
    if (this.sceneStarted) return;
    this.sceneStarted = true;
    try {
      const { LandingScene } = await import('./landing-scene');
      if (this.destroyed) return;
      this.sceneAnchor().createComponent(LandingScene);
    } catch (cause) {
      reportSceneLoadFailure(cause);
    }
  }

  protected retry(): void {
    this.catalog.reload();
  }

  protected countIn(categoryId: string): number {
    return this.catalog.countInCategory(categoryId);
  }

  protected fallbackImageFor(categoryId: string): string | null {
    return this.fallbackImages().get(categoryId) ?? null;
  }
}
