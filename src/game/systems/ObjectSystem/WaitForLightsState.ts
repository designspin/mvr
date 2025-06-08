import { SystemState } from "../../SystemRunner";
import { ObjectSystem } from "./ObjectsSystem";
import RaceStartedState from "./RaceStartedState";
import { sound } from "@pixi/sound";

class WaitingForLights implements SystemState<ObjectSystem>
{
    private _time = 0;
    private _lightState = 0;

    public fixedUpdate(ctx: ObjectSystem, dt: number)
    {
        this._time += dt;
        if(this._time >= 1 && this._lightState === 0) {
           if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights-1"];
            this._lightState++;
            
            sound.play("audio/red-light-chime.wav", { volume: 0.05 });
        }
        if(this._time >= 2 && this._lightState === 1) {
            if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights-2"];
            this._lightState++;

            sound.play("audio/red-light-chime.wav", { volume: 0.05 });
        }
        if(this._time >= 3 && this._lightState === 2) {
            if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights-3"];
            this._lightState++;

            sound.play("audio/red-light-chime.wav", { volume: 0.05 });
        }
        if(this._time >= 4 && this._lightState === 3) {
            if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights-4"];
            this._lightState++;

            sound.play("audio/red-light-chime.wav", { volume: 0.05 });
        }
        if(this._time >= 5 && this._lightState === 4) {
            if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights-5"];
            this._lightState++;

            sound.play("audio/red-light-chime.wav", { volume: 0.05 });
        }
        if(this._time >= 6 && this._lightState === 5) {
            if(ctx.lightsRef) ctx.lightsRef.texture = ctx.game.sheet.textures["start-lights"];
            this._lightState++;

            sound.play("audio/red-light-out.wav", { volume: 0.05 });
        }
        if(this._lightState === 6) {
            ctx.signals.onLightsReady.emit();
            ctx.switchState();
        }
    }
    doAction(ctx: ObjectSystem): void {
        ctx.setState && ctx.setState(new RaceStartedState());
    };
}

export default WaitingForLights;