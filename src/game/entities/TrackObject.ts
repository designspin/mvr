import { Sprite, Texture } from "pixi.js";

export class TrackObject extends Sprite {
    offset: number = 0;
    source: string = "";

    constructor(texture: Texture, offset: number, source: string)
    {
        super(texture);
        this.offset = offset;
        this.source = source;
        //this.anchor.set(0.5, 0);
    }

    get ObjectScale()
    {
        let scale: number;

        switch(this.source)
        {
            case "tree":
                scale = 1;
                break;
            case "billboard":
                scale = 1;
                break;
            case "tree-2":
                scale = 1;
                break;
            case "small-bush":
                scale = 0.3;
                break;
            case "large-bush":
                scale = 0.5;
                break;
            case "stand":
            case "stand-left":
                scale = 4;
                break;
            case "start-lights":
                scale = 3;
                break;
            default:
                scale = 1;
        }
        return scale * (1 / this.texture?.width);
    }
}