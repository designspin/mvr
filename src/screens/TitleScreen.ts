import { Container, Sprite } from "pixi.js";
import { AppScreen, navigation } from "../navigation";
import { EasingFunctions, animate, i18n } from "../utilities";
import { designConfig } from "../game/designConfig";
import { SecondaryButton } from "../ui/buttons/SecondaryButton";
import { GameScreen } from "./GameScreen";

export class TitleScreen extends Container implements AppScreen
{
    public static SCREEN_ID = 'title';
    public static assetBundles = ['images/title-screen'];

    private _title!: Sprite;
    private _flags!: Sprite;
    private _playBtn!: SecondaryButton;

    private _topAnimContainer = new Container();
    private _bottomAnimContainer = new Container();

    constructor()
    {
        super();

        this._buildDetails();

        this._buildButtons();
        
        this.addChild(this._topAnimContainer, this._bottomAnimContainer);
    }

    public prepare()
    {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
    }

    public async show()
    {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;

        const top = animate((progress) => {
            this._topAnimContainer.alpha = 1 * progress;
            this._topAnimContainer.y = -205 + (205 * progress);
            this._title.scale.set(1 * progress);
        }, 1000, EasingFunctions.easeInOutElastic);

        const bottom = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 * progress;
            this._bottomAnimContainer.y = designConfig.content.height + (-designConfig.content.height * progress);
            this._flags.scale.set(2 - (1 * progress));
        }, 1000, EasingFunctions.easeInOutElastic);

        return await Promise.all([top, bottom]);
    }

    public async hide()
    {
        this._topAnimContainer.alpha = 1;
        this._bottomAnimContainer.alpha = 1;
        this._topAnimContainer.y = 0;

        const top = animate((progress) => {
            this._topAnimContainer.alpha = 1 - (1 * progress);
            this._topAnimContainer.y = 0 - (205 * progress);
            this._title.scale.set(1 - (1 * progress));
        }, 500, EasingFunctions.easeInOutQuad);

        const bottom = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 - (1 * progress);
            this._bottomAnimContainer.y = 0 - (-designConfig.content.height * progress);
            this._flags.scale.set(1 + (1 * progress));
        }, 500, EasingFunctions.easeInOutCubic);

        return await Promise.all([top, bottom]);
    }

    private _buildDetails()
    {
        this._title = Sprite.from('title-logo');
        this._title.anchor.set(0.5);
        this._title.x = designConfig.content.width / 2;
        this._title.y = designConfig.content.height / 2 - 102;
        this._flags = Sprite.from('cross-flags');
        this._flags.anchor.set(0.5);
        this._flags.x = designConfig.content.width / 2;
        this._flags.y = designConfig.content.height / 2 - 10;

        this._topAnimContainer.addChild(this._title);
        this._bottomAnimContainer.addChild(this._flags);
    }

    private _buildButtons()
    {
        this._playBtn = new SecondaryButton({
            text: i18n.t('titlePlay'),
            tint: 0xffffff,
        })

        this._playBtn.anchor.set(0.5);

        this._playBtn.x = designConfig.content.width / 2;
        this._playBtn.y = designConfig.content.height / 2 + 100;

        this._playBtn.onPress.connect(() => {
            navigation.gotoScreen(GameScreen);
        });

        this._bottomAnimContainer.addChild(this._playBtn);
    }
}