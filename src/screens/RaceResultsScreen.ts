import { Container, Text, Sprite } from "pixi.js";
import { AppScreen } from "../navigation";
import { designConfig } from "../game/designConfig";
import { animate, EasingFunctions } from "../utilities";
import { SecondaryButton } from "../ui/buttons/SecondaryButton";

interface RaceResultData {
    trackName: string;
    results: {
        driverId: string;
        driverName: string;
        position: number;
        lapTime: number;
        bestLapTime: number;
        points: number;
        isPlayer: boolean;
    }[];
}

class RaceResultsPanel {
    public view = new Container();

    private readonly _titleText: Text;
    private readonly _trackText: Text;
    private readonly _playerResultContainer: Container;
    private readonly _resultsContainer: Container;

    constructor() {
        this._titleText = new Text({
            style: {
                fontSize: 28,
                fill: 0xffc42c,
                fontWeight: 'bold',
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: 'RACE RESULTS'
        });
        this._titleText.anchor.set(0.5, 0);
        this._titleText.x = designConfig.content.width / 2;
        this._titleText.y = 15;
        this.view.addChild(this._titleText);

        this._trackText = new Text({
            style: {
                fontSize: 16,
                fill: 0xffffff,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: 'Test Track 1'
        });
        this._trackText.anchor.set(0.5, 0);
        this._trackText.x = designConfig.content.width / 2;
        this._trackText.y = 50;
        this.view.addChild(this._trackText);

        this._playerResultContainer = new Container();
        this._playerResultContainer.y = 75;
        this.view.addChild(this._playerResultContainer);

        this._resultsContainer = new Container();
        this._resultsContainer.x = designConfig.content.width / 2;
        this._resultsContainer.y = 145;
        this.view.addChild(this._resultsContainer);
    }

    public setRaceResults(data: RaceResultData) {
        this._trackText.text = data.trackName;

        this._playerResultContainer.removeChildren();
        this._resultsContainer.removeChildren();

        const playerResult = data.results.find(r => r.isPlayer);
        if (playerResult) {
            this.createPlayerResultHighlight(playerResult);
        }

        this.createResultsTable(data.results);
    }

    private createPlayerResultHighlight(playerResult: RaceResultData['results'][0]) {
        const bg = new Container();
        
        const positionText = new Text({
            style: {
                fontSize: 32,
                fill: this.getPositionColor(playerResult.position),
                fontWeight: 'bold',
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: this.getPositionText(playerResult.position)
        });
        positionText.anchor.set(0.5);
        positionText.x = designConfig.content.width / 2;
        positionText.y = 0;
        bg.addChild(positionText);

        const pointsText = new Text({
            style: {
                fontSize: 18,
                fill: 0xffc42c,
                fontWeight: 'bold',
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: `+${playerResult.points} POINTS`
        });
        pointsText.anchor.set(0.5);
        pointsText.x = designConfig.content.width / 2;
        pointsText.y = 28;
        bg.addChild(pointsText);

        const lapTimeText = new Text({
            style: {
                fontSize: 14,
                fill: 0xffffff,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: `Best Lap: ${this.formatLapTime(playerResult.bestLapTime)}`
        });
        lapTimeText.anchor.set(0.5);
        lapTimeText.x = designConfig.content.width / 2;
        lapTimeText.y = 50;
        bg.addChild(lapTimeText);

        this._playerResultContainer.addChild(bg);
    }

    private createResultsTable(results: RaceResultData['results']) {
        const header = this.createResultRow('POS', 'DRIVER', 'TIME', 'POINTS', 0, true);
        this._resultsContainer.addChild(header);

        results.forEach((result, index) => {
            const y = 25 + (index * 18);
            const row = this.createResultRow(
                result.position.toString(),
                result.driverName,
                this.formatLapTime(result.lapTime),
                result.points.toString(),
                y,
                false,
                result.driverId === 'player'
            );
            this._resultsContainer.addChild(row);
        });
    }

    private createResultRow(
        position: string,
        name: string,
        time: string,
        points: string,
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

        const timeText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue Regular',
                align: 'center'
            },
            text: time
        });
        timeText.x = halfWidth - 80;
        row.addChild(timeText);

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
        pointsText.x = halfWidth - 30;
        row.addChild(pointsText);

        return row;
    }

    private getPositionText(position: number): string {
        switch (position) {
            case 1: return '1ST PLACE!';
            case 2: return '2ND PLACE';
            case 3: return '3RD PLACE';
            default: return `${position}TH PLACE`;
        }
    }

    private getPositionColor(position: number): number {
        switch (position) {
            case 1: return 0x00ff00; // Gold/Green for 1st
            case 2: return 0xc0c0c0; // Silver for 2nd
            case 3: return 0xcd7f32; // Bronze for 3rd
            default: return 0xffffff; // White for others
        }
    }

    private formatLapTime(timeInSeconds: number): string {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
}

type RaceResultsCallback = () => void;

export class RaceResultsScreen extends Container implements AppScreen {
    public static SCREEN_ID = 'race-results';
    public static assetBundles = ['title-screen']; 

    private readonly _panel: RaceResultsPanel;
    private readonly _continueButton: SecondaryButton;
    private _callback!: RaceResultsCallback;

    private _title!: Sprite;
    private _flags!: Sprite;
    private _topAnimContainer = new Container();
    private _bottomAnimContainer = new Container();
    private _contentContainer = new Container();

    constructor() {
        super();

        this._buildBackground();

        this._panel = new RaceResultsPanel();
        this._contentContainer.addChild(this._panel.view);

        this._continueButton = new SecondaryButton({
            text: 'CONTINUE',
            tint: 0xffffff,
            textStyle: {
                fontSize: 24
            }
        });
        this._continueButton.anchor.set(0.5);
        this._continueButton.x = designConfig.content.width - 100;
        this._continueButton.y = designConfig.content.height - 40;
        this._contentContainer.addChild(this._continueButton);

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
        this._continueButton.onPress.connect(() => {
            if (this._callback) {
                this._callback();
            }
        });
    }

    public prepare(data: {
        raceResults: RaceResultData;
        callback: RaceResultsCallback;
    }) {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
        this._contentContainer.alpha = 0;

        this._panel.setRaceResults(data.raceResults);
        this._callback = data.callback;
    }

    public async show() {
        this._topAnimContainer.alpha = 0;
        this._bottomAnimContainer.alpha = 0;
        this._contentContainer.alpha = 0;

        const topBg = animate((progress) => {
            this._topAnimContainer.alpha = 1 * progress;
            this._topAnimContainer.y = -80 + (80 * progress);
            this._title.scale.set(0.7 + (0.3 * progress));
        }, 800, EasingFunctions.easeInOutElastic);

        const bottomBg = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 * progress;
            this._bottomAnimContainer.y = designConfig.content.height * 0.4 + (-designConfig.content.height * 0.4 * progress);
            this._flags.scale.set(1.8 - (0.8 * progress));
        }, 800, EasingFunctions.easeInOutElastic);

        const content = animate((progress) => {
            this._contentContainer.alpha = progress;
            this._contentContainer.scale.set(0.8 + (0.2 * progress));
        }, 500, EasingFunctions.easeOutQuint);

        setTimeout(() => content, 300);

        return await Promise.all([topBg, bottomBg]);
    }

    public async hide() {
        const topBg = animate((progress) => {
            this._topAnimContainer.alpha = 1 - progress;
            this._topAnimContainer.y = 0 - (80 * progress);
            this._title.scale.set(1 - (0.3 * progress));
        }, 250, EasingFunctions.easeInOutQuad);

        const bottomBg = animate((progress) => {
            this._bottomAnimContainer.alpha = 1 - progress;
            this._bottomAnimContainer.y = 0 - (-designConfig.content.height * 0.4 * progress);
            this._flags.scale.set(1 + (0.8 * progress));
        }, 250, EasingFunctions.easeInOutCubic);

        const content = animate((progress) => {
            this._contentContainer.alpha = 1 - progress;
            this._contentContainer.scale.set(1 - (0.2 * progress));
        }, 200, EasingFunctions.easeInQuad);

        return await Promise.all([topBg, bottomBg, content]);
    }
}
