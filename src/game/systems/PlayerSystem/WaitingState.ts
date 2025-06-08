import { PlayerSystem } from ".";
import { percentRemaining, interpolate } from "../../../utilities";
import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { RacingState } from "./RacingState";
import { designConfig } from "../../designConfig";
import { sound } from "@pixi/sound";

export class WaitingState implements SystemState<PlayerSystem> {
    private _revLevel: number = 0;
    private _revDecay: number = 0.02;
    private _revBounce: number = 0;

    update(ctx: PlayerSystem, _: number) {
        const isAccelerating = 
            (ctx.accelData?.state === "pressed") || 
            ctx.keyUp.isDown;
        
        if (isAccelerating) {
            this._revLevel = Math.min(this._revLevel + 0.05, 1.0);
            
            this._revBounce = Math.min(5, this._revBounce + 0.5);
        } else {
            this._revLevel = Math.max(0, this._revLevel - this._revDecay);
            
            this._revBounce = Math.max(0, this._revBounce - 0.2);
        }

        if (sound.exists('audio/engine-loop.wav')) {
            const enginePitch = 0.8 + (this._revLevel * 1.2);
            sound.find('audio/engine-loop.wav').speed = enginePitch;
            
            sound.find('audio/engine-loop.wav').volume = 0.4 + (this._revLevel * 0.1);
        }

        this.renderStaticCar(ctx);
    }

    doAction(ctx: PlayerSystem) {
        ctx.setState && ctx.setState(new RacingState());
    }

    private renderStaticCar(ctx: PlayerSystem) {
        const track = ctx.game.systems.get(TrackSystem);
        const playerSegment = ctx.segment;
        const playerPercent = percentRemaining(ctx.game.camera.position + ctx.Z, track.segmentLength);

        const verticalBounce = Math.sin(Date.now() / 20) * (this._revBounce * 0.1);
        const horizontalShake = Math.sin(Date.now() / 10) * (this._revBounce * 0.05);

        const destW = ctx.width * (ctx.game.camera.depth / ctx.Z) * 
                    (designConfig.content.width / 2) * 
                    ctx.scale * track.roadWidth;
                    
        const destX = designConfig.content.width / 2;
        
        const destY = designConfig.content.height / 2 -
                    ((ctx.game.camera.depth / ctx.Z) *
                    interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) *
                    designConfig.content.height) / 2;
                    
        ctx.sprite.x = destX + (destW * -0.5) + horizontalShake;
        ctx.sprite.y = destY + verticalBounce;;
        ctx.shadow.x = destX + (destW * -0.5) + horizontalShake;
        ctx.shadow.y = destY + 10 + verticalBounce;
        
        ctx.sprite.scale.set(destW / ctx.width);
        ctx.shadow.scale.set(destW / ctx.width);
    }
}