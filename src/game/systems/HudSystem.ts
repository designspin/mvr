import { System } from "../SystemRunner";
import { Game } from "../";
import { Container } from "pixi.js";
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

    public init()
    {
        this.view.addChild(this._gameHudContainer);
        this.game.stage.addChild(this.view);

        const pause = this.game.systems.get(PauseSystem);

        this._pauseButton = new IconButton('icon-pause');
        this._pauseButton.onPress.connect(() => pause.pause());
        this._pauseButton.x = designConfig.content.width - 40;
        this._pauseButton.y = 40;

        this._gameHudContainer.width = designConfig.content.width;
        this._gameHudContainer.height = designConfig.content.height;

        this._gameHudContainer.addChild(this._pauseButton);

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

    public awake()
    {
        this._gameHudContainer.visible = true;
    }
}