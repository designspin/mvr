import { Container, Sprite, Text } from "pixi.js";
import { AppScreen } from "../navigation";
import { designConfig } from "../game";
import { animate, EasingFunctions, i18n } from "../utilities";

export class LoadScreen extends Container implements AppScreen
{
    public static SCREEN_ID = 'loader';
    public static assetBundles = ['images/preload'];

    private readonly _spinnerTop: Sprite;
    private readonly _spinnerBottom: Sprite;
    private readonly _text: Text;
    
    constructor()
    {
        super();

        this._spinnerBottom = Sprite.from('spinner-red');
        this._spinnerBottom.anchor.set(0.5);
        this._spinnerBottom.y = designConfig.content.height / 2;
        this._spinnerBottom.x = designConfig.content.width / 2;
        this.addChild(this._spinnerBottom);

        this._spinnerTop = Sprite.from('spinner-yellow');
        this._spinnerTop.anchor.set(0.6);
        this._spinnerTop.scale.set(0.5);
        this._spinnerTop.y = designConfig.content.height / 2;
        this._spinnerTop.x = designConfig.content.width / 2;
        this.addChild(this._spinnerTop);

        this._text = new Text(i18n.t('loading'), {
            fontFamily: 'Bungee Regular',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });

        this._text.anchor.set(0.5);
        this._text.y = designConfig.content.height / 2 + 100;
        this._text.x = designConfig.content.width / 2;
        this.addChild(this._text);

    }

    public async show()
    {
        this.alpha = 0;
        
        await animate((progress) => {
            this.alpha = 1 * progress;
        }, 300, EasingFunctions.easeInQuad);
    }

    public async hide()
    {
        this.alpha = 1;
        
        await animate((progress) => {
            this.alpha = 1 - (1 * progress);
        }, 300, EasingFunctions.easeOutQuad);
    }

    public update(delta: number)
    {
        this._spinnerTop.rotation += 0.06 * delta;
        this._spinnerBottom.rotation += 0.03 * delta;
    }

}