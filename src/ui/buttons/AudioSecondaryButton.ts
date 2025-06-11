import { FancyButton, Switcher } from "@pixi/ui";
import { Sprite, Text } from "pixi.js";

import { storage } from "../../storage";
import { i18n } from "../../utilities";
import { getAnimations } from "./configs/animationConfig";

const DEFAULT_SCALE = 0.75;

export class AudioSecondaryButton extends FancyButton
{
    private _switcher: Switcher;

    constructor()
    {
        const isMuted = storage.getStorageItem('muted');

        const switcher = new Switcher([
            'icon-sound-on',
            'icon-sound-off',       
        ],
        [],
        isMuted ? 1 : 0);

        switcher.scale.set(0.95);

        const text = new Text(i18n.t('sound'), {
            fill: 0x000000,
            fontFamily: 'Bungee-Regular',
            fontWeight: 'bold',
            align: 'center',
            fontSize: 40,
        });

        super({
            defaultView: 'button-flat',
            icon: switcher,
            iconOffset: {
                x: 90,
            },
            anchor: 0.5,
            text,
            textOffset: {
                default: {
                    x: -30,
                },
            },
            animations: getAnimations(DEFAULT_SCALE),
            scale: DEFAULT_SCALE,
        });

        (this.defaultView as Sprite).tint = 0x49c8ff;
        
        this._switcher = switcher;

        this.onPress.connect(() => {
            const isMuted = storage.setStorageItem('muted', !storage.getStorageItem('muted'));
            this.forceSwitch(isMuted);
            return 0;
        });
    }

    public forceSwitch(muted: boolean)
    {
        this._switcher.forceSwitch(muted ? 1 : 0);
    }
}