import { Container, Text, Sprite } from "pixi.js";
import { AppScreen, navigation } from "../navigation";
import { designConfig } from "../game";
import { animate, EasingFunctions } from "../utilities";
import { ChampionshipManager } from "../game/championship";
import { SecondaryButton } from "../ui/buttons/SecondaryButton";
import { TitleScreen } from "./TitleScreen";
import { GameScreen } from "./GameScreen";

class ChampionshipPanel {
    public view = new Container();

    private readonly _titleText: Text;
    private readonly _standingsContainer: Container;
    private readonly _progressText: Text;
    private readonly _nextRaceText: Text;

    constructor() {
        this._titleText = new Text({
            style: {
                fontSize: 24,
                fill: 0xffc42c,
                fontWeight: 'bold',
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: 'CHAMPIONSHIP STANDINGS'
        });
        this._titleText.anchor.set(0.5, 0);
        this._titleText.x = designConfig.content.width / 2;
        this._titleText.y = 15;
        this.view.addChild(this._titleText);

        this._progressText = new Text({
            style: {
                fontSize: 16,
                fill: 0xffffff,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: 'Race 1 of 6'
        });
        this._progressText.anchor.set(0.5, 0);
        this._progressText.x = designConfig.content.width / 2;
        this._progressText.y = 45;
        this.view.addChild(this._progressText);

        this._nextRaceText = new Text({
            style: {
                fontSize: 14,
                fill: 0xcccccc,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: 'Next: Test Track 1'
        });
        this._nextRaceText.anchor.set(0.5, 0);
        this._nextRaceText.x = designConfig.content.width / 2;
        this._nextRaceText.y = 68;
        this.view.addChild(this._nextRaceText);

        this._standingsContainer = new Container();
        this._standingsContainer.x = designConfig.content.width / 2;
        this._standingsContainer.y = 95;
        this.view.addChild(this._standingsContainer);
    }

    public updateStandings() {
        const championshipManager = ChampionshipManager.getInstance();
        const championship = championshipManager.getCurrentChampionship();
        
        if (!championship) {
            championshipManager.createNewChampionship();
        }

        const progress = championshipManager.getChampionshipProgress();
        this._progressText.text = `Race ${progress.completed + 1} of ${progress.total}`;

        const nextRace = championshipManager.getCurrentRace();
        if (nextRace) {
            this._nextRaceText.text = `Next: ${nextRace.trackName}`;
        } else if (championshipManager.isChampionshipComplete()) {
            this._nextRaceText.text = 'Championship Complete!';
        }

        this._standingsContainer.removeChildren();

        const standings = championshipManager.getChampionshipStandings();

        const headerY = 0;
        const header = this.createStandingRow('POS', 'DRIVER', 'TEAM', 'POINTS', 'WINS', headerY, true);
        this._standingsContainer.addChild(header);

        standings.forEach((driver, index) => {
            const y = 25 + (index * 20);
            const position = (index + 1).toString();
            const isPlayer = driver.id === 'player';
            
            const row = this.createStandingRow(
                position,
                driver.name,
                driver.team,
                driver.championshipPoints.toString(),
                driver.raceWins.toString(),
                y,
                false,
                isPlayer
            );
            
            this._standingsContainer.addChild(row);
        });
    }

    private createStandingRow(
        position: string,
        name: string,
        team: string,
        points: string,
        wins: string,
        y: number,
        isHeader: boolean = false,
        isPlayer: boolean = false
    ): Container {
        const row = new Container();
        row.y = y;

        const fontSize = isHeader ? 16 : 14;
        const color = isHeader ? 0xffc42c : (isPlayer ? 0x00ff00 : 0xffffff);
        const fontWeight = isHeader || isPlayer ? 'bold' : 'normal';

        const tableWidth = 400;
        const halfWidth = tableWidth / 2;

        const posText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: position
        });
        posText.x = -halfWidth + 30;
        row.addChild(posText);

        const nameText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue Regular',
                align: 'left'
            },
            text: name
        });
        nameText.x = -halfWidth + 60;
        row.addChild(nameText);

        const teamText = new Text({
            style: {
                fontSize: fontSize - 2,
                fill: isHeader ? color : 0xcccccc,
                fontWeight: isHeader ? fontWeight : 'normal',
                fontFamily: 'BebasNeue Regular',
                align: 'left'
            },
            text: team
        });
        teamText.x = -halfWidth + 180;
        row.addChild(teamText);

        const pointsText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: points
        });
        pointsText.x = halfWidth - 80;
        row.addChild(pointsText);

        const winsText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: wins
        });
        winsText.x = halfWidth - 30;
        row.addChild(winsText);

        return row;
    }
}

export class ChampionshipScreen extends Container implements AppScreen {
    public static SCREEN_ID = 'championship';
    public static assetBundles = ['title-screen'];

    private readonly _panel: ChampionshipPanel;
    private readonly _backButton: SecondaryButton;
    private readonly _startRaceButton: SecondaryButton;

    private _title!: Sprite;
    private _flags!: Sprite;
    private _topAnimContainer = new Container();
    private _bottomAnimContainer = new Container();
    private _contentContainer = new Container();

    constructor() {
        super();

        this._buildBackground();
        
        this._panel = new ChampionshipPanel();
        this._contentContainer.addChild(this._panel.view);

        this._backButton = new SecondaryButton({
            text: 'BACK TO MENU',
            tint: 0xffffff,
            textStyle: {
                fontSize: 20
            }
        });
        this._backButton.anchor.set(0.5);
        this._backButton.x = 100;
        this._backButton.y = designConfig.content.height - 50;
        this._contentContainer.addChild(this._backButton);

        this._startRaceButton = new SecondaryButton({
            text: 'START NEXT RACE',
            tint: 0xffffff,
            textStyle: {
                fontSize: 20
            }
        });
        this._startRaceButton.anchor.set(0.5);
        this._startRaceButton.x = designConfig.content.width - 100;
        this._startRaceButton.y = designConfig.content.height - 50;
        this._contentContainer.addChild(this._startRaceButton);

        this.addChild(this._topAnimContainer, this._bottomAnimContainer, this._contentContainer);

        this.setupInteraction();
    }

    private _buildBackground() {
        this._title = Sprite.from('title-logo');
        this._title.anchor.set(0.5);
        this._title.x = designConfig.content.width / 2;
        this._title.y = designConfig.content.height / 2 - 102;
        this._title.alpha = 0.2;
        
        this._flags = Sprite.from('cross-flags');
        this._flags.anchor.set(0.5);
        this._flags.x = designConfig.content.width / 2;
        this._flags.y = designConfig.content.height / 2 - 10;
        this._flags.alpha = 0.2; 

        this._topAnimContainer.addChild(this._title);
        this._bottomAnimContainer.addChild(this._flags);
    }

    private setupInteraction() {
        this._backButton.onPress.connect(() => {
            navigation.gotoScreen(TitleScreen);
        });

        this._startRaceButton.onPress.connect(() => {
            const championshipManager = ChampionshipManager.getInstance();
            const nextRace = championshipManager.getCurrentRace();
            
            if (nextRace && !championshipManager.isChampionshipComplete()) {
                console.log(`Starting race: ${nextRace.trackName}`);
                navigation.gotoScreen(GameScreen);
            }
        });
    }

    public prepare() {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
        this._contentContainer.alpha = 0;

        this._panel.updateStandings();
        
        const championshipManager = ChampionshipManager.getInstance();
        
        if (championshipManager.isChampionshipComplete()) {
            this._startRaceButton.alpha = 0.5;
            this._startRaceButton.enabled = false;
        } else {
            this._startRaceButton.alpha = 1;
            this._startRaceButton.enabled = true;
        }
    }

    public async show() {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
        this._contentContainer.alpha = 0;

        const topBg = animate((progress) => {
            this._topAnimContainer.alpha = 1 * progress;
            this._topAnimContainer.y = -100 + (100 * progress);
            this._title.scale.set(0.8 + (0.2 * progress));
        }, 600, EasingFunctions.easeInOutElastic);

        const bottomBg = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 * progress;
            this._bottomAnimContainer.y = designConfig.content.height * 0.5 + (-designConfig.content.height * 0.5 * progress);
            this._flags.scale.set(1.5 - (0.5 * progress));
        }, 600, EasingFunctions.easeInOutElastic);

        const content = animate((progress) => {
            this._contentContainer.alpha = progress;
            this._contentContainer.scale.set(0.9 + (0.1 * progress));
        }, 400, EasingFunctions.easeOutQuad);

        setTimeout(() => content, 200);

        return await Promise.all([topBg, bottomBg]);
    }

    public async hide() {
        const topBg = animate((progress) => {
            this._topAnimContainer.alpha = 1 - progress;
            this._topAnimContainer.y = 0 - (100 * progress);
            this._title.scale.set(1 - (0.2 * progress));
        }, 300, EasingFunctions.easeInOutQuad);

        const bottomBg = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 - progress;
            this._bottomAnimContainer.y = 0 - (-designConfig.content.height * 0.5 * progress);
            this._flags.scale.set(1 + (0.5 * progress));
        }, 300, EasingFunctions.easeInOutCubic);

        const content = animate((progress) => {
            this._contentContainer.alpha = 1 - progress;
            this._contentContainer.scale.set(1 - (0.1 * progress));
        }, 200, EasingFunctions.easeInQuad);

        return await Promise.all([topBg, bottomBg, content]);
    }
}
