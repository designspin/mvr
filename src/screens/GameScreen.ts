import { Container, Ticker } from "pixi.js";
import { Game } from "../game";
import { animate } from "../utilities";
import type { AppScreen } from "../navigation";

export class GameScreen extends Container implements AppScreen
{
    public static SCREEN_ID = 'game';
    public static assetBundles = ['images/game-screen'];

    private readonly _game: Game;

    constructor()
    {
        super();
        this._game = new Game();
        this._game.init();
        this.addChild(this._game.stage);
    }
    public async show()
    {
        this._game.awake();

        this.alpha = 0;

        await animate(progress => {
            this.alpha = 1 * progress;
        })
        
        this._game.start();
    }

    public async hide()
    {
        this.alpha = 1;
        
        this._game.end();

        await animate(progress => {
            this.alpha = 1 - (1 * progress);
        });

        this._game.reset();
    }

    public update(time: Ticker)
    {
        this._game.update(time);
    }
}