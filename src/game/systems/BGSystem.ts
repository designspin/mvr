import { Container, TilingSprite } from "pixi.js";
import { Game } from "..";
import { System } from "../SystemRunner";
import { increase } from "../../utilities";
import { designConfig } from "..";
import { PlayerSystem } from "./PlayerSystem";
import { gameConfig } from "../gameConfig";

export class BGSystem implements System
{
    public static SYSTEM_ID = 'bg';
    public game!: Game;
    public view = new Container();

    private _bgBack!: TilingSprite;
    private _bgBackStartPos: number = 0;
    private _bgMid!: TilingSprite;
    private _bgMidStartPos: number = 0;
    private _bgFront!: TilingSprite;
    private _bgFrontStartPos: number = 0;

    public init()
    {
        this._bgBack = new TilingSprite({texture: this.game.sheet?.textures["sky-back"], width: designConfig.content.width, height: this.game.sheet?.textures["sky-back"].height});
        this._bgMid = new TilingSprite({ texture: this.game.sheet?.textures['mountains'], width: designConfig.content.width, height: this.game.sheet?.textures['mountains'].height});
        this._bgMid.y = (designConfig.content.height / 4) * 3 - this.game.sheet?.textures['mountains'].height;
        this._bgFront = new TilingSprite({ texture: this.game.sheet?.textures['trees'], width: designConfig.content.width, height: this.game.sheet?.textures['trees'].height});
        this._bgFront.y = (designConfig.content.height / 4) * 2.5 - this.game.sheet?.textures['trees'].height;
        this.view.addChild(this._bgBack, this._bgMid, this._bgFront);
        this.game.stage.addChild(this.view);    
    }

    public update()
    {
        const player = this.game.systems.get(PlayerSystem);
        
        this._bgBack.tilePosition.x = this._bgBack.tilePosition.x -  Math.floor(designConfig.content.width * increase(
            this._bgBack.tilePosition.x, 
            0.001 * player.segment.curve * (this.game.camera.position - this._bgBackStartPos) / gameConfig.trackData.level1.segLength, 
            1));

        this._bgMid.tilePosition.x = this._bgMid.tilePosition.x - Math.floor(designConfig.content.width * increase(
            this._bgMid.tilePosition.x, 
            0.002 * player.segment.curve * (this.game.camera.position - this._bgMidStartPos) / gameConfig.trackData.level1.segLength, 
            1));
        
        this._bgFront.tilePosition.x = this._bgFront.tilePosition.x - Math.floor(designConfig.content.width * increase(
            this._bgFront.tilePosition.x, 
            0.003 * player.segment.curve * (this.game.camera.position - this._bgFrontStartPos) / gameConfig.trackData.level1.segLength, 
            1));

        this._bgBackStartPos = this.game.camera.position;
        this._bgMidStartPos = this.game.camera.position;
        this._bgFrontStartPos = this.game.camera.position;
    }
}