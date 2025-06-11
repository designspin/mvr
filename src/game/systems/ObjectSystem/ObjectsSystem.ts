import { Game } from "../..";
import { System, SystemState, SystemStateMachine } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { ISegment, randomChoice } from "../../../utilities";
import { designConfig } from "../..";
import { TrackObject } from "../../entities/TrackObject";
import WaitingForLights from "./WaitForLightsState";
import { Signal } from "typed-signals";

export class ObjectSystem implements System, SystemStateMachine<ObjectSystem> {
    public static SYSTEM_ID = 'object';
    public game!: Game;

    private visibleObjects: TrackObject[] = [];

    public signals = {
        onLightsReady: new Signal<() => void>()
    };

    public lightsRef: TrackObject | undefined = undefined;

    constructor(private _state: SystemState<ObjectSystem> = new WaitingForLights()) { }

    setState(state: SystemState<ObjectSystem>) {
        this._state = state;
    }

    getState() {
        return this._state;
    }

    switchState() {
        this._state.doAction(this);
    }

    public init() {
        
    }

    public awake() {
        this.resetSprites();
    }

    public update(interpolated: number) {
        this._state.update?.(this, interpolated);
        this.render();
    }
    
    public fixedUpdate(fixedDelta: number) {
        this._state.fixedUpdate?.(this, fixedDelta);
    }

    public render() {
        const track = this.game.systems.get(TrackSystem);
        const baseSegment = track.findSegment(this.game.camera.position);

        // for(let i = 0; i < track.segments.length; i++) {
        //     const segment = track.segments[i];
        //     if(segment.sprites === undefined || segment.sprites.length === 0) {
        //         continue;
        //     }
        //     for(let j = 0; j < segment.sprites.length; j++) {
        //         segment.sprites[j].visible = false;
        //     }
        // }

        for (const sprite of this.visibleObjects) {
            sprite.visible = false;
        }

        this.visibleObjects = [];

        for (let n = this.game.camera.drawDistance - 1; n > 0; n--) {
            const segment: ISegment = track.segments[(baseSegment.index + n) % track.segments.length];

            if (segment.sprites === undefined || segment.sprites.length === 0) {
                continue;
            }

            for (let i = 0; i < (segment.sprites?.length ?? 0); i++) {

                const sprite = segment.sprites![i];
                const spriteScale = segment.p1.screen.scale;
                let spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * track.roadWidth * designConfig.content.width / 2);
                let spriteY = segment.p1.screen.y;

                const destW =
                    (sprite.texture.width *
                        spriteScale *
                        (designConfig.content.width / 2)) *
                    (sprite.ObjectScale * track.roadWidth);

                const destH =
                    (sprite.texture.height *
                        spriteScale *
                        (designConfig.content.width / 2)) *
                    (sprite.ObjectScale * track.roadWidth);

                spriteX = spriteX + (destW * (sprite.offset < 0 ? -1 : 0));
                spriteY = spriteY + (destH * -1);

                const clipH = segment.clip ? Math.max(0, spriteY + destH - segment.clip) : 0;

                if (clipH < destH) {
                    sprite.x = spriteX;
                    sprite.y = spriteY;
                    sprite.zIndex = this.game.camera.drawDistance - n;
                    sprite.scale.set(destW / sprite.texture.width);
                    sprite.visible = true;

                    this.visibleObjects.push(sprite);
                }
            }
        }
    }

    private addSprite(n: number, source: string, offset: number) {
        const track = this.game.systems.get(TrackSystem);

        if (track.segments[n] === undefined) {
            return;
        }
        if (track.segments[n].sprites === undefined) {
            track.segments[n].sprites = [];
        }
        const sprite = new TrackObject(this.game.getTexture(source), offset, source);

        sprite.cullable = true;
        sprite.visible = false;
        track.segments[n].sprites?.push(sprite);
        track.view.addChild(sprite);

        return sprite;
    }

    private resetSprites() {
        const track = this.game.systems.get(TrackSystem);
        const objects = ["tree", "tree-2", "small-bush", "large-bush"];

        this.lightsRef = this.addSprite(5, "start-lights", 0);
        this.lightsRef?.anchor.set(0.5, 0);

        this.addSprite(20, "stand-left", -1.5);
        this.addSprite(40, "Billboard", -1.5);
        this.addSprite(60, "Billboard", -1.5);
        this.addSprite(80, "stand-left", -1.5);
        this.addSprite(100, "Billboard", -1.5);
        this.addSprite(120, "Billboard", -1.5);
        this.addSprite(140, "stand-left", -1.5);
        this.addSprite(160, "Billboard", -1.5);
        this.addSprite(180, "Billboard", -1.5);
        this.addSprite(200, "stand-left", -1.5);

        this.addSprite(20, "stand", 1.5);
        this.addSprite(40, "Billboard", 1.5);
        this.addSprite(60, "Billboard", 1.5);
        this.addSprite(80, "stand", 1.5);
        this.addSprite(100, "Billboard", 1.5);
        this.addSprite(120, "Billboard", 1.5);
        this.addSprite(140, "stand", 1.5);
        this.addSprite(160, "Billboard", 1.5);
        this.addSprite(180, "Billboard", 1.5);
        this.addSprite(200, "stand", 1.5);

        for (let i = 220; i < track.segments.length; i += Math.floor(Math.random() * 10) + 1) {
            this.addSprite(i, objects[Math.floor(Math.random() * objects.length)], randomChoice([1, -1]) * (2 + Math.floor(Math.random() * 5)));
            this.addSprite(i, objects[Math.floor(Math.random() * objects.length)], randomChoice([1, -1]) * (2 + Math.floor(Math.random() * 5)));
            this.addSprite(i, objects[Math.floor(Math.random() * objects.length)], randomChoice([1, -1]) * (2 + Math.floor(Math.random() * 5)));
            this.addSprite(i, objects[Math.floor(Math.random() * objects.length)], randomChoice([1, -1]) * (2 + Math.floor(Math.random() * 5)));
        }
    }

    public reset(): void {
        const track = this.game.systems.get(TrackSystem);

        // 1. Hide all currently visible objects
        for (const sprite of this.visibleObjects) {
            sprite.visible = false;
        }
        this.visibleObjects = [];

        // 2. Remove all existing sprites from segments and display list
        for (const segment of track.segments) {
            if (segment.sprites && segment.sprites.length > 0) {
                // Remove sprites from display
                for (const sprite of segment.sprites) {
                    if (sprite.parent) {
                        sprite.parent.removeChild(sprite);
                    }
                }
                // Clear sprites array
                segment.sprites = [];
            }
        }

        // 3. Reset lights reference
        this.lightsRef = undefined;

        // 4. Reset state machine
        this.setState(new WaitingForLights());

        // 5. Recreate all objects
        this.resetSprites();
    }
}