import { designConfig } from "../..";
import { ISegment, interpolate } from "../../../utilities";
import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { CarSystem } from "./CarSystem";
import RacingState from "./RacingState";

class IdleState implements SystemState<CarSystem>
{
    update(ctx: CarSystem, dt: number)
    {
        dt = dt / 100;

        const track = ctx.game.systems.get(TrackSystem);
        const baseSegment = track.findSegment(ctx.game.camera.position);
        
        for (let n = ctx.game.camera.drawDistance - 1; n > 0; n--) {
            const segment: ISegment = track.segments[(baseSegment.index + n) % track.segments.length];

            if (segment.cars === undefined || segment.cars.length === 0) {
                segment.cars = [];
                continue;
            }

            for (let i = 0; i < segment.cars.length; i++) {
                const car = segment.cars[i];

                const width = car.texture.width;
                const height = car.texture.height;
                const spriteScale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
                let spriteX = interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) + (spriteScale * car.offset * track.roadWidth * width / 2);
                let spriteY = interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);

                const destW =
                    (width *
                        spriteScale *
                        (designConfig.content.width / 2)) *
                    (car.displayScale * track.roadWidth);

                const destH =
                    (height *
                        spriteScale *
                        (designConfig.content.width / 2)) *
                    (car.displayScale * track.roadWidth);

                const destX = spriteX + (destW * -0.5);
                const destY = spriteY + (destH * -1);

                const clipH = segment.clip ? Math.max(0, destY + destH - segment.clip) : 0;

                if (clipH < destH) {
                    car.x = destX;
                    car.y = destY;
                    car.zIndex = ctx.game.camera.drawDistance - n + i;
                    car.scale.set(destW / width);
                    car.visible = true;  
                } 
            }
        }
    }
    doAction(ctx: CarSystem) {
        ctx.setState(new RacingState())
    };
}

export default IdleState;