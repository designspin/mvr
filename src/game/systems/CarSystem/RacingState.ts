import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { CarSystem } from "./CarSystem";
import { ISegment, accelerate, increase, interpolate, limit, overlap, percentRemaining } from "../../../utilities";
import { designConfig } from "../../designConfig";
import { PlayerSystem } from "../PlayerSystem";
import Car from "../../entities/Car";
import { gameConfig } from "../../gameConfig";
import { Texture } from "pixi.js";

class RacingState implements SystemState<CarSystem>
{
    update(ctx: CarSystem, dt: number)
    {
        dt = dt / 100;

        const track = ctx.game.systems.get(TrackSystem);
        const baseSegment = track.findSegment(ctx.game.camera.position);

        this.updateCars(ctx, dt);
        
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

    private updateCars(ctx: CarSystem, dt: number)
    {
        const track = ctx.game.systems.get(TrackSystem);
        
        for(let i = 0; i < ctx.cars.length; i++)
        {
            const car = ctx.cars[i];

            car.visible = false;
            const segment = track.findSegment(car.z);
            car.offset = car.offset + this.updateCarOffset(ctx, car, segment);
            car.speed = accelerate(car.speed, car.accel, dt);
            car.speed = limit(car.speed, 0, car.maxSpeed);
            car.z = increase(car.z, dt * car.speed, track.trackLength);
            car.percent = percentRemaining(car.z, track.segmentLength);

            const newSegment = track.findSegment(car.z);

            if (segment !== newSegment) {
                
                const index = segment.cars && segment.cars?.indexOf(car);
                index !== undefined && segment.cars?.splice(index, 1);
                if (newSegment.cars === undefined) {
                    newSegment.cars = [];
                }
                newSegment.cars.push(car);
                
            }
        }
    }

    private updateCarOffset(ctx: CarSystem, car: Car, carSegment: ISegment): number
    {
        const player = ctx.game.systems.get(PlayerSystem);
        const track = ctx.game.systems.get(TrackSystem);
        let segment: ISegment;
        let otherCar: Car;
        let otherCarW: number;
        let dir: number;

        const carW = car.texture?.width * car.displayScale;
    
        if(carSegment.index - player.segment.index > ctx.game.camera.drawDistance) {
            car.visible = false;
            return 0;
        }

        for(let i = 1; i < gameConfig.lookAhead; i++) {
            segment = track.segments[(carSegment.index + i) % track.segments.length];
            
            // const curveSpeedReduction: { [key: number]: number } = {
            //     0: 1,
            //     2: 0.98,
            //     4: 0.96,
            //     6: 0.94
            // };

            // const speedReduction = curveSpeedReduction[Math.abs(segment.curve)];
            // car.speed *= speedReduction;
            
            if (
                segment === player.segment &&
                car.speed > player.speed &&
                overlap(player.X, player.width, car.offset, carW, 1.2)
            ) {
                if(player.X > 0.5) dir = -1;
                else if(player.X < -0.5) dir = 1;
                else dir = (car.offset > player.X) ? 1 : -1;
                return dir * 1 / i * (car.speed - player.speed) / player.maxSpeed;
            }

            if(segment.cars !== undefined && segment.cars.length > 0)
            for(let j = 0; j < segment.cars?.length; j++) {
                otherCar = segment.cars[j];
                otherCarW = otherCar.texture?.width * otherCar.displayScale;
                if(car.speed > otherCar.speed && overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)) {
                    if(otherCar.offset > 0.5) dir = -1;
                    else if(otherCar.offset < -0.5) dir = 1;
                    else dir = (car.offset > otherCar.offset) ? 1 : -1;
                    return dir * 1 / i * (car.speed - otherCar.speed) / player.maxSpeed;
                }
            }

            const steer = segment.curve;
            const upDown = segment.p2.world.y - segment.p1.world.y;
            let texture: Texture;

            if(ctx.game.sheet?.textures) {
                if(steer < 0) texture = upDown > 0 ? steer < -4 ? ctx.game.sheet.textures[`car-${car.spriteNum}-uphill-left-hard`] : ctx.game.sheet.textures[`car-${car.spriteNum}-uphill-left`] : steer < -4 ? ctx.game.sheet.textures[`car-${car.spriteNum}-left-hard`] : ctx.game.sheet.textures[`car-${car.spriteNum}-left`];
                else if(steer > 0) texture = upDown > 0 ? steer > 4 ? ctx.game.sheet.textures[`car-${car.spriteNum}-uphill-right-hard`] : ctx.game.sheet.textures[`car-${car.spriteNum}-uphill-right`] : steer > 4 ? ctx.game.sheet.textures[`car-${car.spriteNum}-right-hard`] : ctx.game.sheet.textures[`car-${car.spriteNum}-right`];
                else texture = upDown > 0 ? ctx.game.sheet.textures[`car-${car.spriteNum}-uphill`] : ctx.game.sheet.textures[`car-${car.spriteNum}-straight`];
            
                car.texture = texture;
            }
        }

        if(car.offset < -0.9) return 0.1;
        else if(car.offset > 0.9) return -0.1;
        else return 0;
    }

    doAction(_ctx: CarSystem) {
    };
}

export default RacingState;