import { Container, Graphics, Sprite } from "pixi.js";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export interface ControlButtonChangeEvent
{
    state: ControlButtonState;
}

export interface ControlButtonSettings
{
    btnColor: number;
    btn?: Graphics | Sprite | Container;
    onChange?: (event: ControlButtonChangeEvent) => void;
}

export enum ControlButtonState
{
    IDLE = 'idle',
    PRESSED = 'pressed'
}

export class ControlButton extends Container
{
    settings: ControlButtonSettings;
    button!: Graphics | Sprite | Container;

    constructor(opts: ControlButtonSettings)
    {
        super();

        this.settings = Object.assign({
            btnColor: 0xFF0000
        }, opts);

        if(!this.settings.btn) {
            const button = new Graphics();
            button.circle(0, 0, 30);
            button.fill(this.settings.btnColor);
            button.alpha = 0.5;
            this.settings.btn = button;
        }

        this.init();
    }

    init()
    {
        this.button = this.settings.btn!;

        if('anchor' in this.button) {
            this.button.anchor.set(0.5);
        }

        this.addChild(this.button);

        this.bindEvents();
    }

    bindEvents()
    {
        let that = this;
        this.interactive = true;

        function onPointerDown()
        {
            that.button.alpha = 1;
            that.settings.onChange?.({ state: ControlButtonState.PRESSED });

            try {
                Haptics.impact({ style: ImpactStyle.Light });
            } catch {
                if(navigator.vibrate) {
                    navigator.vibrate(15);
                }
            }
        }

        function onPointerUp()
        {
            that.button.alpha = 0.5;
            that.settings.onChange?.({ state: ControlButtonState.IDLE });
        }

        this.on('pointerdown', onPointerDown);
        this.on('pointerup', onPointerUp);
        this.on('pointerupoutside', onPointerUp);
        this.on('pointerout', onPointerUp);
    }
}