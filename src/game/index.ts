import { Assets, Container, Ticker } from 'pixi.js';
import { SystemRunner } from './SystemRunner';
import { PauseSystem } from './systems/PauseSystem';
import { HudSystem } from './systems/HudSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { TrackSystem } from './systems/TrackSystem';
import { MiniMapSystem } from './systems/MiniMapSystem';

import Camera from './camera';
import { BGSystem } from './systems/BGSystem';
import { CarSystem } from './systems/CarSystem/CarSystem';
import { ObjectSystem } from './systems/ObjectSystem/ObjectsSystem';
import { device } from '../utilities/device';
export { designConfig } from './designConfig';

export class Game
{
    public stage = new Container();
    public gameContainer = new Container();
    public camera = new Camera();
    public systems: SystemRunner;
    public isGameOver = false;
    public level = 1;
    public isMobileDevice = device.isMobileDevice();
    public sheet?: any;

    constructor()
    {
        this.stage.addChild(this.gameContainer);
        this.systems = new SystemRunner(this);
    }

    public addToGame(...views: Container[])
    {
        views.forEach(view => {
            this.gameContainer.addChild(view);
        });
    }

    public removeFromGame(...views: Container[])
    {
        views.forEach(view => {
            view.removeFromParent();
        });
    }

    public async init()
    {
        this.sheet = Assets.cache.get("game-screen");

        this.systems.add(BGSystem);
        this.systems.add(PauseSystem);
        this.systems.add(TrackSystem);
        this.systems.add(CarSystem);
        this.systems.add(ObjectSystem);
        this.systems.add(PlayerSystem);
        this.systems.add(HudSystem);
        this.systems.add(MiniMapSystem);
        await this.systems.init();
    }

    public async awake()
    {
        await this.systems.awake();
        this.gameContainer.visible = true;
    }

    public async start()
    {
        this.systems.start();
    }

    public async gameOver()
    {
        this.isGameOver = true;
        this.gameContainer.visible = false;
    }

    public async end()
    {
        this.systems.end();
    }

    public update(time: Ticker)
    {
        if(this.systems.get(PauseSystem).isPaused || this.isGameOver) return;
        this.systems.update(time);
    }

    public reset()
    {
        this.isGameOver = false;
        this.systems.reset();
    }
}