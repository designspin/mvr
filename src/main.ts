import { Application } from 'pixi.js';
import { initAssets } from './assets';
import { navigation } from './navigation';
import { designConfig } from './game';
import { storage } from './storage';

import { LoadScreen } from './screens/LoadScreen';
import { TitleScreen } from './screens/TitleScreen';

import './style.css'

export const app = new Application();

// export const app = new Application<HTMLCanvasElement>({
//   resolution: Math.max(window.devicePixelRatio, 2),
//   backgroundColor: 0x448EE2,
//   width: designConfig.content.width,
//   height: designConfig.content.height,
// });

// @ts-ignore
globalThis.__PIXI_APP__ = app;

export let hasInteracted = false;

function preventZoom(e: TouchEvent): void {
  const t2 = e.timeStamp;
  const t1 = (e.currentTarget as HTMLElement).dataset.lastTouch ? 
    Number((e.currentTarget as HTMLElement).dataset.lastTouch) : t2;
  const dt = t2 - t1;
  const fingers = e.touches.length;
  (e.currentTarget as HTMLElement).dataset.lastTouch = t2.toString();

  if (!dt || dt > 500 || fingers > 1) return; // not double-tap

  e.preventDefault();
  (e.target as HTMLElement).click();
}

async function init()
{
    navigation.init();

    await app.init({
        resolution: Math.max(window.devicePixelRatio, 2),
        backgroundColor: 0x448EE2,
        width: designConfig.content.width,
        height: designConfig.content.height,
    })
    
    document.body.appendChild(app.canvas);

    app.canvas.addEventListener('touchstart', preventZoom, { passive: false });
    
    await initAssets();

    storage.readyStorage();

    navigation.setLoadScreen(LoadScreen);

    document.addEventListener('pointerdown', () => { hasInteracted = true }, { once: true });

    await navigation.gotoScreen(TitleScreen);
  }

  init();

