import { PlayerSystem } from ".";
import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { sound } from "@pixi/sound";
import { accelerate, increase, interpolate, limit, mapToSmaller, overlap, percentRemaining, randomChoice } from "../../../utilities";
import { designConfig } from "../../designConfig";
import { HudSystem } from "../HudSystem";

export class RacingState implements SystemState<PlayerSystem> {
    private _totalLaps: number = 3;

    private _prevX: number = 0;
    private _prevZ: number = 0;
    private _physicsX: number = 0;
    private _physicsZ: number = 0;
    private _physicsSpeed: number = 0;

    fixedUpdate(ctx: PlayerSystem, fixedDelta: number) {
        this._prevX = ctx.X;
        this._prevZ = ctx.Z;

        this.processPhysics(ctx, fixedDelta);
        this.checkCollisions(ctx);

        this._physicsX = ctx.X;
        this._physicsZ = ctx.Z;
        this._physicsSpeed = ctx.speed;
    }

    update(ctx: PlayerSystem, interpolation: number) {
        const interpolatedX = this._prevX + (this._physicsX - this._prevX) * interpolation;
        const interpolatedZ = this._prevZ + (this._physicsZ - this._prevZ) * interpolation;

        this.updateVisuals(ctx, interpolatedX, interpolatedZ);
        this.checkLapComplete(ctx);
    }

    private processPhysics(ctx: PlayerSystem, dt: number) {
        const track = ctx.game.systems.get(TrackSystem);

        if (ctx.gearChangeDelay > 0) {
            ctx.gearChangeDelay--;
        }

        if ((ctx.keyShift.isDown || ctx.gearChangeRequest) && ctx.gearChangeDelay === 0) {
            const previousSpeed = ctx.speed;

            ctx.currentGear = ctx.currentGear === 'LOW' ? 'HIGH' : 'LOW';
            ctx.gearChangeDelay = 30;

            if (ctx.currentGear === 'LOW' && previousSpeed > ctx.maxSpeedLow) {
                ctx.overrevving = true;
            } else {
                ctx.overrevving = false;
            }
            ctx.gearChangeRequest = false;
        }

        ctx.game.camera.position = increase(ctx.game.camera.position, dt * ctx.speed, track.trackLength);

        const playerSegment = ctx.segment;

        ctx.totalRaceDistance = playerSegment.index * track.segmentLength;

       const absoluteSpeedFactor = ctx.speed / (ctx.maxSpeedHigh * 0.8);
        const dx = dt * 2 * Math.min(absoluteSpeedFactor, 1.0);

        if (ctx.movementData?.direction === "left" ||
            ctx.movementData?.direction === "top-left" ||
            ctx.movementData?.direction === "bottom-left" ||
            ctx.racing && ctx.keyLeft.isDown) {
            ctx.X = ctx.X - dx;
        } else if (ctx.movementData?.direction === "right" ||
            ctx.movementData?.direction === "top-right" ||
            ctx.movementData?.direction === "bottom-right" ||
            ctx.racing && ctx.keyRight.isDown) {
            ctx.X = ctx.X + dx;
        }

        ctx.X = ctx.X - (dx * absoluteSpeedFactor * playerSegment.curve * 0.32);

        if (ctx.accelData?.state === "pressed" || ctx.keyUp.isDown && ctx.racing) {
            ctx.speed = accelerate(ctx.speed, ctx.accel, dt);
        } else if (ctx.brakeData?.state === "pressed" || ctx.keyDown.isDown && ctx.racing) {
            ctx.speed = accelerate(ctx.speed, ctx.breaking, dt);
        } else {
            ctx.speed = accelerate(ctx.speed, ctx.decel, dt);
        }

        if (ctx.X < -1 || ctx.X > 1) {
            if (ctx.speed > ctx.offRoadLimit) {
                ctx.speed = accelerate(ctx.speed, ctx.offRoadDecel, dt);
            }
        }

        if (ctx.overrevving) {
            const overrevDecel = ctx.decel * 4; // Overrevving deceleration
            ctx.speed = accelerate(ctx.speed, overrevDecel, dt);

            if (ctx.speed <= ctx.maxSpeed) {
                ctx.overrevving = false;
            }
        } else {
            ctx.speed = limit(ctx.speed, 0, ctx.maxSpeed);
        }

        ctx.X = limit(ctx.X, -3, 3);
    }

    private checkCollisions(ctx: PlayerSystem) {
        const track = ctx.game.systems.get(TrackSystem);
        const playerSegment = ctx.segment;

        if (ctx.X < -1 || ctx.X > 1) {
            if (playerSegment.sprites !== undefined && playerSegment.sprites.length > 0) {
                for (let n = 0; n < playerSegment.sprites.length; n++) {
                    const sprite = playerSegment.sprites[n];
                    const spriteW = sprite.texture.width * sprite.ObjectScale;
                    if (overlap(ctx.X, ctx.width, sprite.offset + spriteW / 2 * (sprite.offset > 0 ? 1 : -1), spriteW, 0.8)) {
                        ctx.speed = ctx.maxSpeed / 5;
                        ctx.game.camera.position = increase(playerSegment.p1.world.z, -ctx.Z, track.trackLength);
                    }
                }
            }
        }

        if (playerSegment.cars !== undefined && playerSegment.cars.length > 0) {
            for (let n = 0; n < playerSegment.cars.length; n++) {
                const car = playerSegment.cars[n];
                const carW = car.texture?.width * car.displayScale;
                if (ctx.speed > car.speed) {
                    if (overlap(ctx.X, ctx.width, car.offset, carW, 0.8)) {
                        ctx.speed = car.speed * (car.speed / ctx.speed);
                        ctx.game.camera.position = increase(car.z, -ctx.Z, track.trackLength);
                    }
                }
            }
        }
    }

    private updateVisuals(ctx: PlayerSystem, interpolatedX: number, interpolatedZ: number) {
        const gearFactor = ctx.currentGear === 'HIGH' ? 1.0 : 1.5;
        sound.find('audio/engine-loop.wav').speed = mapToSmaller(ctx.speed, ctx.maxSpeed, 3.2 * gearFactor, 0.8);

        const track = ctx.game.systems.get(TrackSystem);

        const playerSegment = track.findSegment(ctx.game.camera.position + interpolatedZ);
        const playerPercent = percentRemaining(ctx.game.camera.position + interpolatedZ, track.segmentLength);
        ctx.percent = playerPercent;
        const absoluteSpeedFactor = this._physicsSpeed / (ctx.maxSpeedHigh * 0.8);
        const bounce = (15 * Math.random()) * absoluteSpeedFactor * randomChoice([-1, 1]);

        const destW = ctx.width * (ctx.game.camera.depth / interpolatedZ) * (designConfig.content.width / 2) * ctx.scale * track.roadWidth;
        const destH = ctx.height * (ctx.game.camera.depth / interpolatedZ) * (designConfig.content.width / 2) * ctx.scale * track.roadWidth;
        const destX = designConfig.content.width / 2;
        const destY = designConfig.content.height / 2 -
            ((ctx.game.camera.depth / interpolatedZ) *
                interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) *
                designConfig.content.height) / 2;

        ctx.sprite.x = destX + (destW * -0.5) + (interpolatedX * destW * 0.5);;
        ctx.sprite.y = destY + destH * bounce;
        ctx.shadow.x = destX + (destW * -0.5) + (interpolatedX * destW * 0.5);
        ctx.shadow.y = (destY + destH * bounce) + 10;

        ctx.sprite.scale.set(destW / ctx.width);
        ctx.shadow.scale.set(destW / ctx.width);

        const steer = ctx.movementData?.direction || ctx.keyLeft.isDown && ctx.speed > 0 && "left" || ctx.keyRight.isDown && ctx.speed > 0 && "right";
        const power = ctx.movementData?.power;
        const upDown = playerSegment.p2.world.y - playerSegment.p1.world.y;

        this.updateCarTexture(ctx, steer, power, upDown);
    }

    private updateCarTexture(ctx: PlayerSystem, steer: string | false, power: number | undefined, upDown: number) {
        if (ctx.game.sheet?.textures) {
            if (steer === "left" || steer === "top-left" || steer === "bottom-left") {
                if (upDown > 0) {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-uphill-left-hard`) :
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-uphill-left`);
                } else {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-left-hard`) :
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-left`);
                }
            } else if (steer === "right" || steer === "top-right" || steer === "bottom-right") {
                if (upDown > 0) {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-uphill-right-hard`) :
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-uphill-right`);
                } else {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-right-hard`) :
                        ctx.game.getTexture(`car-${PlayerSystem.imageNo}-right`);
                }
            } else {
                if (upDown > 0) {
                    ctx.sprite.texture = ctx.game.getTexture(`car-${PlayerSystem.imageNo}-uphill`);
                } else {
                    ctx.sprite.texture = ctx.game.getTexture(`car-${PlayerSystem.imageNo}-straight`);
                }
            }

            ctx.shadow.texture = ctx.sprite.texture;
        }
    }

    doAction(_: PlayerSystem) {
        // Transition to the next state if needed
        // context.setState(new NextState());
    }

    private checkLapComplete(ctx: PlayerSystem) {
        const playerSegment = ctx.segment;

        if (ctx.previousSegment !== playerSegment && playerSegment.isFinishMarker) {
            const hud = ctx.game.systems.get(HudSystem);
            ctx.lap++;
            hud.setLapCount(ctx.lap);
        }

        if (ctx.lap >= this._totalLaps) {
            // Transition to a state that handles the end of the race
        }

        ctx.previousSegment = playerSegment;
    }
}