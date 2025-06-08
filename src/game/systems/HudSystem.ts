import { System } from "../SystemRunner";
import { Game } from "../";
import { Container, Text, TextStyle } from "pixi.js";
import { designConfig } from "../designConfig";
import { IconButton } from "../../ui/buttons/IconButton";
import { PauseSystem } from "./PauseSystem";
import { TouchJoystick, JoystickChangeEvent } from '../TouchJoystick';
import { ControlButton, ControlButtonChangeEvent } from "../ControlButton";
import { Signal } from "typed-signals";

export class HudSystem implements System {
    public static SYSTEM_ID = 'hud';
    public game!: Game;
    public view = new Container();

    public signals = {
        onTouchJoystickStart: new Signal<() => void>(),
        onTouchJoystickMove: new Signal<(data: JoystickChangeEvent) => void>(),
        onTouchJoystickEnd: new Signal<() => void>(),
        onAccelChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
        onBrakeChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
        onGearChange: new Signal<(data: ControlButtonChangeEvent) => void>()
    };

    private readonly _gameHudContainer = new Container();
    private _pauseButton!: IconButton;
    private _joystick!: TouchJoystick;
    private _accelButton!: ControlButton;
    private _brakeButton!: ControlButton;
    private _gearButton!: ControlButton;

    private _lapCounter!: Text;
    private _positionCounter!: Text;

    public async awake() {
        this.initWhenTrackReady();
        this._gameHudContainer.visible = true;
    }
    
    public initWhenTrackReady() {
        this.view.addChild(this._gameHudContainer);
        this.game.stage.addChild(this.view);

        const pause = this.game.systems.get(PauseSystem);

        this._pauseButton = new IconButton('icon-pause');
        this._pauseButton.onPress.connect(() => pause.pause());
        this._pauseButton.x = designConfig.content.width - 40;
        this._pauseButton.y = 40;

        const style = new TextStyle({
            fontFamily: 'Bungee Regular',
            fontSize: 24,
            fill: 0xffffff,
            stroke: {
                width: 4,
                color: 0x000000,
                join: 'round'
            },
            align: 'center'
        });

        this._lapCounter = new Text({ text: 'Laps: 0/3', style: style });
        this._lapCounter.x = 20;
        this._lapCounter.y = 20;

        this._positionCounter = new Text({ text: 'Pos: 12', style: style });
        this._positionCounter.x = 20;
        this._positionCounter.y = 50;

        this._gameHudContainer.width = designConfig.content.width;
        this._gameHudContainer.height = designConfig.content.height;

        this._gameHudContainer.addChild(this._pauseButton);
        this._gameHudContainer.addChild(this._lapCounter);
        this._gameHudContainer.addChild(this._positionCounter);

        if (this.game.isMobileDevice) {
            this._joystick = new TouchJoystick({
                onStart: () => {
                    this.signals.onTouchJoystickStart.emit();
                },
                onChange: (data) => {
                    this.signals.onTouchJoystickMove.emit(data);
                },
                onEnd: () => {
                    this.signals.onTouchJoystickEnd.emit();
                }
            });

            this._joystick.x = 100;
            this._joystick.y = designConfig.content.height - 100;

            this._accelButton = new ControlButton({
                btnColor: 0x00FF00,
                onChange: (data) => {
                    this.signals.onAccelChange.emit(data);
                }
            });

            this._accelButton.x = designConfig.content.width - 100;
            this._accelButton.y = designConfig.content.height - 80;

            this._brakeButton = new ControlButton({
                btnColor: 0xFF0000,
                onChange: (data) => {
                    this.signals.onBrakeChange.emit(data);
                }
            });

            this._brakeButton.x = designConfig.content.width - 180;
            this._brakeButton.y = designConfig.content.height - 80;

            this._gearButton = new ControlButton({
                btnColor: 0x0000FF,
                onChange: (data) => {
                    this.signals.onGearChange.emit(data);
                }
            });
            this._gearButton.x = designConfig.content.width - 40;
            this._gearButton.y = designConfig.content.height - 120;

            this._gameHudContainer.addChild(this._joystick, this._accelButton, this._brakeButton, this._gearButton);
        }
    }

    public setLapCount(laps: number) {
        const displayLaps = laps <= 0 ? 0 : laps;
        this._lapCounter.text = `Laps: ${displayLaps}/3`;
    }

    public setPosition(position: number) {
        this._positionCounter.text = `Pos: ${position}`;
    }

    public reset(): void {
        this._gameHudContainer.removeChildren();

        if (this._gameHudContainer.parent) {
            this._gameHudContainer.parent.removeChild(this._gameHudContainer);
        }

        if (this.view.parent) {
            this.view.parent.removeChild(this.view);
        }

        this.signals.onTouchJoystickStart.disconnectAll();
        this.signals.onTouchJoystickMove.disconnectAll();
        this.signals.onTouchJoystickEnd.disconnectAll();
        this.signals.onAccelChange.disconnectAll();
        this.signals.onBrakeChange.disconnectAll();
        this.signals.onGearChange.disconnectAll();

        this.view = new Container();

        this._gameHudContainer.visible = true;

        if (this._lapCounter) this.setLapCount(-1); 
        if (this._positionCounter) this.setPosition(1);
    }
}