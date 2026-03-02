import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import gsap from 'gsap';

// Configura GSAP prima che Angular avvii la zone
// Usa il setInterval nativo (non patchato da Zone.js) per il ticker GSAP
const nativeSI = (window as any).__zone_symbol__setInterval ?? window.setInterval;
const nativeCI = (window as any).__zone_symbol__clearInterval ?? window.clearInterval;
gsap.ticker.lagSmoothing(0);
(gsap.ticker as any).sleep();
(gsap.ticker as any).wake();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
