import { Application } from 'pixi.js';
import { initAssets } from './assets';
import { navigation } from './navigation';
import { designConfig } from './game';
import { storage } from './storage';

import { LoadScreen } from './screens/LoadScreen';
import { TitleScreen } from './screens/TitleScreen';

import './style.css'

export const app = new Application<HTMLCanvasElement>({
  resolution: Math.max(window.devicePixelRatio, 2),
  backgroundColor: 0x448EE2,
  width: designConfig.content.width,
  height: designConfig.content.height,
});

// @ts-ignore
globalThis.__PIXI_APP__ = app;

export let hasInteracted = false;

async function init()
{
    navigation.init();
    
    document.body.appendChild(app.view);

    await initAssets();

    storage.readyStorage();

    navigation.setLoadScreen(LoadScreen);

    document.addEventListener('pointerdown', () => { hasInteracted = true }, { once: true });

    await navigation.gotoScreen(TitleScreen);
  }

  init();

