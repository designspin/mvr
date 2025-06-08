import { Container, Sprite, Texture } from "pixi.js";
import { Game } from "..";
import { System } from "../SystemRunner";
import { designConfig } from "..";
import { PlayerSystem } from "./PlayerSystem";

export class BGSystem implements System {
    public static SYSTEM_ID = 'bg';
    public game!: Game;
    public view = new Container();

    private _bgBack: Array<Sprite> = [];
    private _bgBackStartPos: number = 0;
    private _bgMid: Array<Sprite> = [];
    private _bgMidStartPos: number = 0;
    private _bgFront: Array<Sprite> = [];
    private _bgFrontStartPos: number = 0;

    public init() {
        this._bgBack = this.createBackgroundSprites(this.game.sheet?.textures["sky-back"]);
        this._bgMid = this.createBackgroundSprites(this.game.sheet?.textures['mountains']);
        this._bgMid.forEach(sprite => {
            sprite.y = (designConfig.content.height / 4) * 3 - sprite.height;
        });
        this._bgFront = this.createBackgroundSprites(this.game.sheet?.textures['trees']);
        this._bgFront.forEach(sprite => {
            sprite.y = (designConfig.content.height / 4) * 2.5 - sprite.height;
        });
        
        this.view.zIndex = -1000;
    }

    public async awake() {    
        this.view.addChild(...this._bgBack, ...this._bgMid, ...this._bgFront);
        this.game.stage.addChild(this.view);
    }

    private createBackgroundSprites(texture: Texture): Sprite[] {
        
        texture.source.addressMode = "repeat";
        texture.source.scaleMode = "nearest";
        texture.source.antialias = false;
        
        const sprites = [];
        for (let i = 0; i < 2; i++) {
            const sprite = new Sprite(texture);
            sprite.x = i * sprite.width;
            sprites.push(sprite);
        }
        return sprites;
    }

    public update() {
        const player = this.game.systems.get(PlayerSystem);

        if (player.segment.curve === 0) return;

        const curve = player.segment.curve;
        const cameraPos = this.game.camera.position;

        const updatePosition = (sprites: Sprite[], startPos: number, factor: number) => {
            for (const sprite of sprites) {
                sprite.x -= factor * curve * (player.speed / 10000);
                if (sprite.x + sprite.width < 0) {
                    sprite.x += sprite.width * sprites.length;
                } else if (sprite.x > sprite.width * (sprites.length - 1)) {
                    sprite.x -= sprite.width * sprites.length;
                }
            }
            startPos = cameraPos;
            return startPos;
        }

        updatePosition(this._bgBack, this._bgBackStartPos, 0.25); // slower
        this._bgBackStartPos = cameraPos;

        updatePosition(this._bgMid, this._bgMidStartPos, 0.5); // slower
        this._bgMidStartPos = cameraPos;

        updatePosition(this._bgFront, this._bgFrontStartPos, 0.75); // slower
        this._bgFrontStartPos = cameraPos;
    }

    public reset() {
        this._bgBackStartPos = 0;
        this._bgMidStartPos = 0;
        this._bgFrontStartPos = 0;

        this.view.removeChildren();
    }
}