import { Container, Graphics, Sprite, Text } from "pixi.js";
import { EasingFunctions, animate, i18n } from "../../utilities";
import { AppScreen } from "../../navigation";
import { designConfig } from "../../game";
import { SecondaryButton } from "../../ui/buttons/SecondaryButton";

class PausePanel
{
    public view = new Container();

    private readonly _base: Sprite;
    private readonly _titleText: Text;
    private readonly _scoreTitleText: Text;
    private readonly _scoreText: Text;

    constructor()
    {
        this._base = Sprite.from('images/pause-overlay/pause-panel.png');
        this._base.anchor.set(0.5);
        this.view.addChild(this._base);

        this._titleText = new Text(i18n.t('paused'), {
            fontSize: 40,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'BebasNeue Regular',
            align: 'center'
        });

        this._titleText.anchor.set(0.5);
        this._titleText.y = -(this._base.height * 0.50) + 35;
        this._base.addChild(this._titleText);

        this._scoreTitleText = new Text(i18n.t('score'), {
            fontSize: 24,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'BebasNeue Regular',
            align: 'center'
        });

        this._scoreTitleText.anchor.set(0.5);
        this._scoreTitleText.y = -54;
        this._base.addChild(this._scoreTitleText);

        this._scoreText = new Text('0', {
            fontSize: 48,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'BebasNeue Regular',
            align: 'center'
        });

        this._scoreText.anchor.set(0.5);
        this._scoreText.y = -10;
        this._base.addChild(this._scoreText);
    }

    public setScore(score: number)
    {
        this._scoreText.text = score.toLocaleString();

        this._scoreText.style.fontSize = 60;

        while(this._scoreText.width > this._base.width - 20)
        {
            (this._scoreText.style.fontSize)--;
        }
    }
}

type PauseCallback = (state: 'quit' | 'resume') => void;

export class PauseOverlay extends Container implements AppScreen
{
    public static SCREEN_ID = 'pause';
    public static assetBundles = ['images/pause-overlay'];

    private readonly _background: Graphics;
    private readonly _panel: PausePanel;

    private _resumeBtn!: SecondaryButton;
    private _quitBtn!: SecondaryButton;

    private _callBack!: PauseCallback;

    constructor()
    {
        super();

        this._background = new Graphics().beginFill(0x000000, 0.5).drawRect(0, 0, designConfig.content.width, designConfig.content.height);
        this._background.interactive = true;
        this.addChild(this._background);

        this._panel = new PausePanel();
        this._panel.view.x = designConfig.content.width / 2;
        this._panel.view.y = designConfig.content.height / 2;
        this.addChild(this._panel.view);

        this._buildButtons();
    }

    public prepare(data: {
        score: number;
        callback: PauseCallback;
    })
    {
        this._panel.setScore(data.score ?? 0);
        this._callBack = data.callback;
        this._background.alpha = 0;
    }

    public async show()
    {
        this._background.alpha = 0;
        this._panel.view.alpha = 0;

        return await animate((progress) => {
            this._background.alpha = 1 * progress;
            this._panel.view.alpha = 1 * progress;
            this._panel.view.scale.set(1 * progress);
        }, 300, EasingFunctions.easeInOutCubic);
    }

    public async hide()
    {
        this._background.alpha = 1;
        this._panel.view.alpha = 1;
        return await animate((progress) => {
            this._background.alpha = 1 - (1 * progress);
            this._panel.view.alpha = 1 - (1 * progress);
            this._panel.view.scale.set(1 - (1 * progress));
        }, 300 , EasingFunctions.easeInOutCubic);
    }

    private _buildButtons()
    {
        this._resumeBtn = new SecondaryButton({
            textStyle: {
                fontFamily: 'BebasNeue Regular',
                fontSize: 56,
                fontWeight: 'bold',
                align: 'center'
            },
            text: i18n.t('resume'),
            tint: 0xffc42c,
            buttonOptions: {
                scale: 0.6,
            }
        });

        this._quitBtn = new SecondaryButton({
            textStyle: {
                fontFamily: 'BebasNeue Regular',
                fontSize: 56,
                fontWeight: 'bold',
                align: 'center'
            },
            text: i18n.t('quit'),
            tint: 0x000000,
            buttonOptions: {
                scale: 0.6,
            }
        });

        this._resumeBtn.onPress.connect(() => {
            this._callBack?.('resume');
        });

        this._quitBtn.onPress.connect(() => {
            this._callBack?.('quit');
        });

        this._resumeBtn.anchor.set(0.5);
        this._resumeBtn.x = 0;
        this._resumeBtn.y = 70;

        this._quitBtn.anchor.set(0.5);
        this._quitBtn.x = 0;
        this._quitBtn.y = 120;

        this._panel.view.addChild(this._resumeBtn, this._quitBtn);
    }
}