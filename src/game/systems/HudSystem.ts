import { System } from "../SystemRunner";
import { Game } from "../";
import { Container, Text, TextStyle } from "pixi.js";
import { designConfig } from "../designConfig";
import { IconButton } from "../../ui/buttons/IconButton";
import { PauseSystem } from "./PauseSystem";
import { TouchJoystick, JoystickChangeEvent } from '../TouchJoystick';
import { ControlButton, ControlButtonChangeEvent } from "../ControlButton";
import { Signal } from "typed-signals";

export class HudSystem implements System
{
    public static SYSTEM_ID = 'hud';
    public game!: Game;
    public view = new Container();

    public signals = {
        onTouchJoystickStart: new Signal<() => void>(),
        onTouchJoystickMove: new Signal<(data: JoystickChangeEvent) => void>(),
        onTouchJoystickEnd: new Signal<() => void>(),
        onAccelChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
        onBrakeChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
    };

    private readonly _gameHudContainer = new Container();
    private _pauseButton!: IconButton;
    private _joystick!: TouchJoystick;
    private _accelButton!: ControlButton;
    private _brakeButton!: ControlButton;

    private _lapCounter!: Text;
    private _positionCounter!: Text;

    public init()
    {
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

        this._lapCounter = new Text({ text: 'Lap: 0/3', style: style});
        this._lapCounter.x = 20;
        this._lapCounter.y = 20;

        this._positionCounter = new Text({ text: 'Position: 12', style: style});
        this._positionCounter.x = 200;
        this._positionCounter.y = 20;

        this._gameHudContainer.width = designConfig.content.width;
        this._gameHudContainer.height = designConfig.content.height;

        this._gameHudContainer.addChild(this._pauseButton);
        this._gameHudContainer.addChild(this._lapCounter);
        this._gameHudContainer.addChild(this._positionCounter);

        if(this.game.isMobileDevice) {
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

            this._gameHudContainer.addChild(this._joystick, this._accelButton, this._brakeButton);
        }
    }

    public setLapCount(laps: number)
    {
        this._lapCounter.text = `Lap: ${laps}/3`;
    }

    public setPosition(position: number)
    {
        this._positionCounter.text = `Position: ${position}`;
    }

    public awake()
    {
        this._gameHudContainer.visible = true;
    }
}