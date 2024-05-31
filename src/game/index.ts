import { Assets, Container, type DisplayObject } from 'pixi.js';
import { SystemRunner } from './SystemRunner';
import { PauseSystem } from './systems/PauseSystem';
import { HudSystem } from './systems/HudSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { TrackSystem } from './systems/TrackSystem';

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

    public addToGame(...displayObjects: DisplayObject[])
    {
        displayObjects.forEach(displayObject => {
            this.gameContainer.addChild(displayObject);
        });
    }

    public removeFromGame(...displayObjects: DisplayObject[])
    {
        displayObjects.forEach(displayObject => {
            displayObject.removeFromParent();
        });
    }

    public init()
    {
        this.sheet = Assets.cache.get("images/game-screen/game-screen.json");

        this.systems.add(BGSystem);
        this.systems.add(PauseSystem);
        this.systems.add(TrackSystem);
        this.systems.add(CarSystem);
        this.systems.add(ObjectSystem);
        this.systems.add(PlayerSystem);
        this.systems.add(HudSystem);
        this.systems.init();
    }

    public async awake()
    {
        this.systems.awake();
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

    public update(delta: number)
    {
        if(this.systems.get(PauseSystem).isPaused || this.isGameOver) return;
        this.systems.update(delta);
    }

    public reset()
    {
        this.isGameOver = false;
        this.systems.reset();
    }
}