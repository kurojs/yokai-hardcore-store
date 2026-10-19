import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * The application shell: header, routed content, footer.
 *
 * The header and footer live here rather than in `shared/` because they are the shell's own
 * furniture, not reusable presentation: `shared/README.md` scopes that folder to pieces with
 * more than one consumer, and it forbids routing inside it. A `shell/` folder would have been
 * a fifth top-level folder that the architectural contract does not define, so the shell stays
 * in `app.ts` — the one file Angular already reserves for it.
 *
 * The markup is in `app.html` and the styling in `app.scss`, which is where the scaffold put
 * them and what makes the 20 kB of placeholder markup worth replacing rather than extending.
 */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
