import { Container, Text } from "pixi.js";
import { EasingFunctions, animate } from "../../utilities";
import { AppScreen } from "../../navigation";
import { designConfig } from "../../game";

interface LapTimingData {
    currentLapTime: number;
    bestLapTime: number | null;
    position: number;
    lapNumber: number;
    totalLaps: number;
}

class LapCompletionPanel {
    public view = new Container();

    private readonly _lapText: Text;
    private readonly _timeText: Text;

    constructor() {
        this._lapText = new Text({
            style: {
                fontSize: 28,
                fill: 0xffc42c,
                fontWeight: 'bold',
                fontFamily: 'BebasNeue-Regular',
                align: 'center',
                stroke: {
                    color: 0x000000,
                    width: 3
                }
            },
            text: 'LAP 1'
        });
        this._lapText.anchor.set(0.5);
        this._lapText.y = -15;
        this.view.addChild(this._lapText);

        this._timeText = new Text({
            style: {
                fontSize: 24,
                fill: 0xffffff,
                fontWeight: 'bold',
                fontFamily: 'BebasNeue-Regular',
                align: 'center',
                stroke: {
                    color: 0x000000,
                    width: 3
                }
            },
            text: '1:32.45'
        });
        this._timeText.anchor.set(0.5);
        this._timeText.y = 15;
        this.view.addChild(this._timeText);
    }

    public setLapData(data: LapTimingData) {
        this._lapText.text = `LAP ${data.lapNumber}`;

        this._timeText.text = this.formatLapTime(data.currentLapTime);

        if (data.bestLapTime !== null && Math.abs(data.currentLapTime - data.bestLapTime) < 0.01) {
            this._timeText.style.fill = 0x00ff00;
        } else {
            this._timeText.style.fill = 0xffffff;
        }
    }

    private formatLapTime(timeInSeconds: number): string {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
}

type LapCompletionCallback = () => void;

export class LapCompletionOverlay extends Container implements AppScreen {
    public static SCREEN_ID = 'lap-completion';

    private readonly _panel: LapCompletionPanel;
    private _callback!: LapCompletionCallback;
    private _dismissTimeout: NodeJS.Timeout | null = null;

    constructor() {
        super();

        this._panel = new LapCompletionPanel();
        this._panel.view.x = designConfig.content.width / 2;
        this._panel.view.y = 80; 
        this.addChild(this._panel.view);
    }

    public prepare(data: {
        lapData: LapTimingData;
        callback: LapCompletionCallback;
    }) {
        this._panel.setLapData(data.lapData);
        this._callback = data.callback;
        
        if (this._dismissTimeout) {
            clearTimeout(this._dismissTimeout);
            this._dismissTimeout = null;
        }
        
        this._panel.view.alpha = 0;
        this._panel.view.scale.set(0.8);
    }

    public async show() {
        this._panel.view.alpha = 0;
        this._panel.view.scale.set(0.8);

        this._dismissTimeout = setTimeout(() => {
            this._dismiss();
        }, 3000); 

        return await animate((progress) => {
            this._panel.view.alpha = 1 * progress;
            this._panel.view.scale.set(0.8 + (0.2 * progress));
        }, 200, EasingFunctions.easeOutQuad);
    }

    public async hide() {
        this._panel.view.alpha = 1;
        this._panel.view.scale.set(1);

        return await animate((progress) => {
            this._panel.view.alpha = 1 - (1 * progress);
            this._panel.view.scale.set(1 - (0.2 * progress));
        }, 200, EasingFunctions.easeInOutCubic);
    }

    private _dismiss() {
        if (this._dismissTimeout) {
            clearTimeout(this._dismissTimeout);
            this._dismissTimeout = null;
        }
        
        if (this._callback) {
            this._callback();
        }
    }
}
