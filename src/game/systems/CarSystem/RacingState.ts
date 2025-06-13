import { accelerate, increase, interpolate, ISegment, limit, percentRemaining } from "../../../utilities";
import { IRacer } from "../../../utilities/IRacer";
import { designConfig } from "../../designConfig";
import CarEntity from "../../entities/Car";
import { SystemState } from "../../SystemRunner";
import { HudSystem } from "../HudSystem";
import { PlayerSystem } from "../PlayerSystem";
import { TrackSystem } from "../TrackSystem";
import { CarSystem } from "./CarSystem";

interface TrafficInfo {
    carAhead: boolean;
    carToLeft: boolean;
    carToRight: boolean;
    nearestDistance: number;
}

// Interpolation state for each car
interface CarInterpolation {
    prevZ: number;
    prevOffset: number;
    physicsZ: number;
    physicsOffset: number;
    renderZ: number;
    renderOffset: number;
}

class RacingState implements SystemState<CarSystem> {
    private positionUpdateCounter = 0;
    private hud!: HudSystem;
    private track!: TrackSystem;
    private player!: PlayerSystem;
    private initialized = false;

    private carInterpolationMap: Map<CarEntity, CarInterpolation> = new Map();

    public doAction(context: CarSystem) {
        if (!this.initialized) {
            this.initSystems(context);
        }
    };

    private initSystems(context: CarSystem) {
        this.hud = context.game.systems.get(HudSystem);
        this.track = context.game.systems.get(TrackSystem);
        this.player = context.game.systems.get(PlayerSystem);
        this.initialized = true;

        for (const car of context.cars) {
            if (!(car instanceof CarEntity)) continue;

            this.carInterpolationMap.set(car, {
                prevZ: car.z,
                prevOffset: car.offset,
                physicsZ: car.z,
                physicsOffset: car.offset,
                renderZ: car.z,
                renderOffset: car.offset
            });
        }
    }

    public fixedUpdate(ctx: CarSystem, fixedDelta: number) {
        if (!this.initialized) {
            this.initSystems(ctx);
        }

        for (const car of ctx.cars) {
            if (!(car instanceof CarEntity)) continue;

            const interpolation = this.carInterpolationMap.get(car);
            if (interpolation) {
                interpolation.prevZ = car.z;
                interpolation.prevOffset = car.offset;
            }
        }

        this.updateCompetitionState(ctx);

        this.updateRace(ctx, fixedDelta);

        this.positionUpdateCounter++;
        if (this.positionUpdateCounter >= 5) {
            this.updateRacePosition(ctx);
            this.positionUpdateCounter = 0;
        }

        for (const car of ctx.cars) {
            if (!(car instanceof CarEntity)) continue;

            const interpolation = this.carInterpolationMap.get(car);
            if (interpolation) {
                interpolation.physicsZ = car.z;
                interpolation.physicsOffset = car.offset;
            }
        }
    }

    public update(ctx: CarSystem, interpolationFactor: number) {
        if (!this.initialized) {
            this.initSystems(ctx);
        }

        for (const car of ctx.cars) {
            if (!(car instanceof CarEntity)) continue;

            const interpolation = this.carInterpolationMap.get(car);
            if (interpolation) {
                interpolation.renderZ = interpolation.prevZ +
                    (interpolation.physicsZ - interpolation.prevZ) * interpolationFactor;

                interpolation.renderOffset = interpolation.prevOffset +
                    (interpolation.physicsOffset - interpolation.prevOffset) * interpolationFactor;
            }
        }

        const baseSegment = this.track.findSegment(ctx.game.camera.position);
        this.renderCars(ctx, baseSegment);
    }

    private updateCompetitionState(ctx: CarSystem) {
        for (const car of ctx.cars) {
            if (car instanceof CarEntity) {
                car.competingWith = null;
                car.draftingTarget = null;
                car.defendingPosition = false;
            }
        }

        for (let i = 0; i < ctx.cars.length; i++) {
            const car = ctx.cars[i];
            if (!(car instanceof CarEntity)) continue;

            let closestAhead = null;
            let closestBehind = null;
            let distanceToAhead = Infinity;
            let distanceToBehind = Infinity;

            for (let j = 0; j < ctx.cars.length; j++) {
                if (i === j) continue;
                const otherCar = ctx.cars[j];
                if (!(otherCar instanceof CarEntity)) continue;

                const carAhead = this.isCarAhead(car, otherCar);
                const distance = this.getCarDistance(car, otherCar);

                if (carAhead) {
                    if (distance < distanceToAhead) {
                        distanceToAhead = distance;
                        closestAhead = otherCar;
                    }
                } else {
                    if (distance < distanceToBehind) {
                        distanceToBehind = distance;
                        closestBehind = otherCar;
                    }
                }
            }

            const playerAhead = this.isCarAhead(car, this.player);
            const playerDistance = this.getCarDistance(car, this.player);

            this.applyCompetitiveBehaviours(car, closestAhead, distanceToAhead, closestBehind, distanceToBehind, playerAhead, playerDistance);
        }
    }

    private isCarAhead(car1: IRacer, car2: IRacer): boolean {
        if (car1.lap !== car2.lap) {
            return car2.lap > car1.lap;
        }
        return car2.z > car1.z;
    }

    private getCarDistance(car1: IRacer, car2: IRacer): number {
        if (car1.lap === car2.lap) {
            return Math.abs(car2.z - car1.z);
        } else {
            const lapDiff = Math.abs(car2.lap - car1.lap);
            const trackDistance = this.track.trackLength;

            if (car2.lap > car1.lap) {
                return (trackDistance - car1.z) + car2.z + (lapDiff - 1) * trackDistance;
            } else {
                return (trackDistance - car2.z) + car1.z + (lapDiff - 1) * trackDistance;
            }
        }
    }

    private applyCompetitiveBehaviours(car: IRacer,
        closestAhead: IRacer | null,
        distanceToAhead: number,
        closestBehind: IRacer | null,
        distanceToBehind: number,
        playerAhead: boolean,
        playerDistance: number): void {
        if (closestAhead && distanceToAhead < 5 && Math.abs(car.offset - closestAhead.offset) < 0.3) {
            car.draftingTarget = closestAhead;
        }

        if (closestAhead && distanceToAhead < 10 && car.speed > closestAhead.speed) {
            car.competingWith = closestAhead;
        }

        if (closestBehind && distanceToBehind < 5 && closestBehind.speed > car.speed) {
            car.defendingPosition = true;
            car.competingWith = closestBehind;
        }

        if (playerAhead && playerDistance < distanceToAhead && playerDistance < 15) {
            if (playerDistance < 5) {
                car.draftingTarget = null;
            }

            if (Math.abs(car.racePosition - this.player.racePosition) <= 2) {
                car.aggressiveness = Math.min(1, car.aiProfile.aggressiveness * 1.2);
            }
        }
    }

    private updateRacePosition(ctx: CarSystem) {
        const allRacers = [...ctx.cars, this.player];
        
        allRacers.sort((a, b) => {
            if (a.lap !== b.lap) {
                return b.lap - a.lap; // Higher lap first
            }
            return b.totalRaceDistance - a.totalRaceDistance;
        });

        for (let i = 0; i < allRacers.length; i++) {
            allRacers[i].racePosition = i + 1;

            if (allRacers[i] === this.player) {
                this.hud.setPosition(this.player.racePosition);
            }
        }
    }

    private updateRace(ctx: CarSystem, dt: number) {
        for (let i = 0; i < ctx.cars.length; i++) {
            const car = ctx.cars[i];
            if (!(car instanceof CarEntity)) continue;

            car.visible = false;
            const segment = this.track.findSegment(car.z);

            if (this.isRaceStart()) {
                this.handleRaceStartBehaviour(car, segment);
            } else {
                this.handleRaceBehaviour(car, segment);
            }

            this.updateCarPhysics(car, segment, dt);
            this.updateCarTexture(car, segment);
            this.updateCarSegment(car, segment);
        }
    }

    private isRaceStart(): boolean {
        return this.player.lap === -1 && this.player.z < this.track.trackLength * 0.3;
    }

    private handleRaceStartBehaviour(car: CarEntity, segment: ISegment) {
        const trafficInfo = this.handleNearbyTraffic(car, segment);

        const inLeftLane = car.offset < -0.3;
        const inRightLane = car.offset > 0.3;
        const inCenterLane = !inLeftLane && !inRightLane;

        let targetOffset;
        if (inLeftLane) targetOffset = -0.5;
        else if (inRightLane) targetOffset = 0.5;
        else targetOffset = 0;

        if (trafficInfo.carAhead && trafficInfo.nearestDistance < 3) {
            if (inLeftLane && !trafficInfo.carToRight) {
                targetOffset = 0;
            } else if (inRightLane && !trafficInfo.carToLeft) {
                targetOffset = 0;
            } else if (inCenterLane) {
                targetOffset = trafficInfo.carToLeft ? 0.5 : -0.5;
            }
        }

        const offsetDiff = targetOffset - car.offset;
        const moveAmount = Math.abs(offsetDiff) > 0.5 ? 0.015 : 0.007;
        car.offset += offsetDiff > 0 ? moveAmount : -moveAmount;

        car.targetSpeed = car.maxSpeed * 0.7;
    }

    private handleRaceBehaviour(car: CarEntity, segment: ISegment) {
        const racingLineOffset = segment.racingLineOffset || 0;
        const racingLineAttraction = 0.02 * car.aiProfile.cornerSpeedFactor;
        const racingLineDiff = racingLineOffset - car.offset;
        let offsetAdjustment = racingLineDiff * racingLineAttraction;

        if (car.defendingPosition && car.competingWith) {
            const targetOffset = car.competingWith.offset;
            offsetAdjustment += (car.offset < targetOffset) ? 0.01 : -0.01;
        } else if (car.competingWith && car.shouldOvertake(car.competingWith, 10)) {
            const targetOffset = car.competingWith.offset;
            offsetAdjustment += (car.offset < targetOffset) ? -0.02 : 0.02;
        } else if (car.draftingTarget) {
            const targetOffset = car.draftingTarget.offset;
            offsetAdjustment += (car.offset < targetOffset) ? 0.005 : -0.005;
        }

        car.offset += offsetAdjustment;
        car.targetSpeed = this.calculateCornerAwareSpeed(car, segment);

        this.handleTrafficAvoidance(car, segment);
    }

    private handleNearbyTraffic(car: CarEntity, segment: ISegment): TrafficInfo {
        let carAhead = false;
        let carToLeft = false;
        let carToRight = false;
        let nearestDistance = Infinity;

        for (let j = -1; j < 10; j++) {
            const scanSegmentIndex = (segment.index + j) % this.track.segments.length;
            if (scanSegmentIndex < 0) continue;

            const scanSegment = this.track.segments[scanSegmentIndex];
            if (!scanSegment.cars || scanSegment.cars.length === 0) continue;

            for (const otherCar of scanSegment.cars) {
                if (otherCar === car) continue;

                const distance = j > 0 ? j : 0;
                const lateralDistance = Math.abs(otherCar.offset - car.offset);

                if (distance < nearestDistance && j > 0) {
                    nearestDistance = distance;
                }

                if (j >= 0 && lateralDistance < 0.) {
                    carAhead = true;
                } else if (otherCar.offset < car.offset - 0.1) {
                    carToLeft = true;
                } else if (otherCar.offset > car.offset + 0.1) {
                    carToRight = true;
                }
            }
        }

        return { carAhead, carToLeft, carToRight, nearestDistance };
    }

    private handleTrafficAvoidance(car: CarEntity, segment: ISegment) {
        const trafficInfo = this.handleNearbyTraffic(car, segment);

        if (trafficInfo.carAhead) {
            if (!trafficInfo.carToLeft && car.offset > -0.7) {
                car.offset -= 0.05;
            } else if (!trafficInfo.carToRight && car.offset < 0.7) {
                car.offset += 0.05;
            } else {
                if (trafficInfo.nearestDistance < 2) {
                    const minSpeed = car.maxSpeed * 0.3;
                    car.targetSpeed = Math.max(car.targetSpeed * 0.95, minSpeed);

                    if (!car.lastAvoidanceDirection || car.framesSinceDirectionChange > 30) {
                        car.lastAvoidanceDirection = car.offset < 0 ? 1 : -1;
                        car.framesSinceDirectionChange = 0;
                    }

                    const moveAmount = 0.02;

                    if ((car.lastAvoidanceDirection > 0 && car.offset < 0.7) ||
                        (car.lastAvoidanceDirection < 0 && car.offset > -0.7)) {
                        car.offset += car.lastAvoidanceDirection * moveAmount;
                    }

                    car.framesSinceDirectionChange++;
                }
            }
        }
    }

    private calculateCornerAwareSpeed(car: CarEntity, segment: ISegment): number {
        const lookAheadDistance = Math.floor(15 * car.aiProfile.brakingDistance);
        let upcomingCurve = 0;

        for (let j = 1; j < lookAheadDistance; j++) {
            const lookAheadSegement = this.track.segments[(segment.index + j) % this.track.segments.length];

            const racingLineChange = Math.abs(
                (lookAheadSegement.racingLineOffset || 0) -
                (segment.racingLineOffset || 0)
            );

            upcomingCurve = Math.max(upcomingCurve, racingLineChange * (1 - j / lookAheadDistance));
        }

        let targetSpeed = car.maxSpeed;

        if (upcomingCurve > 0.1) {
            const cornerIntensity = Math.min(1, upcomingCurve * 5);
            targetSpeed = car.getCorneringSpeed(cornerIntensity);
        } else if (car.draftingTarget) {
            targetSpeed = car.maxSpeed * 1.05;
        } else {
            targetSpeed = car.adjustSpeedForRacePosition(this.player.racePosition);
        }

        return targetSpeed;
    }

    private updateCarPhysics(car: CarEntity, segment: ISegment, dt: number): void {
        if (car.speed < car.targetSpeed - 0.5) {
            car.speed = accelerate(car.speed, car.boostedAccel, dt);
        } else if (car.speed > car.targetSpeed + 0.5) {
            car.speed = accelerate(car.speed, -car.accel * 1.5, dt);
        } else {
            car.speed = accelerate(car.speed, car.accel * 0.2 * (car.targetSpeed > car.speed ? 1 : -1), dt);
        }


        if (segment.curve !== 0) {
            const curveEffect = segment.curve * 0.1 * (1.5 - car.aiProfile.cornerSpeedFactor);
            car.speed = limit(car.speed, 0, car.maxSpeed - curveEffect);
        } else {
            car.speed = limit(car.speed, 0, car.maxSpeed);
        }

        const distanceTraveled = dt * car.speed;
        car.z = increase(car.z, distanceTraveled, this.track.trackLength);

        car.totalRaceDistance = (Math.max(0, car.lap + 1) * this.track.segments.length + segment.index + car.percent) * this.track.segmentLength;

        car.percent = percentRemaining(car.z, this.track.segmentLength);
    }

    private updateCarSegment(car: CarEntity, currentSegment: ISegment): void {
        const newSegment = this.track.findSegment(car.z);

        if (currentSegment !== newSegment && newSegment) {
            const index = currentSegment.cars?.indexOf(car);
            if (index !== undefined && index >= 0 && currentSegment.cars) {
                currentSegment.cars.splice(index, 1);
            }

            if (newSegment.cars === undefined) {
                newSegment.cars = [];
            }

            // Enhanced lap detection for AI cars
            const hasCompletedLap = this.hasCarCrossedFinishLine(currentSegment, newSegment);
            
            if (hasCompletedLap) {
                if (car.lap === -1) {
                    car.lap = 0;
                } else {
                car.lap++;
                }
                car.adjustSpeedMultiplier(0.98 + Math.random() * 0.04);
            }

            newSegment.cars.push(car);
        }
    }

    /**
     * Enhanced lap detection for AI cars that handles high-speed scenarios.
     * Checks if the car has crossed the finish line even if it didn't land on the exact segment.
     */
    private hasCarCrossedFinishLine(previousSegment: ISegment, currentSegment: ISegment): boolean {
        // Standard case: car landed exactly on finish line segment
        if (currentSegment.isFinishMarker) {
            return true;
        }
        
        // High-speed case: check if we crossed the finish line between segments
        if (previousSegment && previousSegment.index !== currentSegment.index) {
            const finishLineIndex = 0; // Finish line is always segment 0
            const prevIndex = previousSegment.index;
            const currentIndex = currentSegment.index;
            
            // Handle wrap-around at end of track
            if (prevIndex > currentIndex) {
                // We've wrapped around from end to beginning of track
                // Check if finish line (0) is between previous segment and current segment
                return (finishLineIndex >= 0 && finishLineIndex <= currentIndex) || 
                       (prevIndex < this.track.segments.length - 1);
            } else {
                // Normal forward progression
                // Check if finish line is between previous and current segment
                return finishLineIndex > prevIndex && finishLineIndex <= currentIndex;
            }
        }
        
        return false;
    }

    private renderCars(ctx: CarSystem, baseSegment: ISegment) {
        const drawDistance = ctx.game.camera.drawDistance;

        for (let n = drawDistance - 1; n > 0; n--) {
            const segment: ISegment = this.track.segments[((baseSegment.index + n) % this.track.segments.length)];

            if (!segment.cars || segment.cars.length === 0) {
                segment.cars = [];
                continue;
            }

            for (let i = 0; i < segment.cars.length; i++) {
                const car = segment.cars[i];
                this.renderCarInSegment(car, segment, drawDistance, n, i);
            }
        }
    }

    private renderCarInSegment(car: CarEntity, segment: ISegment, drawDistance: number, segmentDistance: number, carIndex: number) {
        const width = car.texture.width;
        const height = car.texture.height;

        const interpolation = this.carInterpolationMap.get(car);
        const renderOffset = interpolation ? interpolation.renderOffset : car.offset;
        const percent = car.percent;
        
        const spriteScale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percent);
        let spriteX = interpolate(segment.p1.screen.x, segment.p2.screen.x, percent) +
            (spriteScale * renderOffset * this.track.roadWidth * width / 2);
        let spriteY = interpolate(segment.p1.screen.y, segment.p2.screen.y, percent);

        const destW = (width * spriteScale * (designConfig.content.width / 2)) *
            (car.displayScale * this.track.roadWidth);
        const destH = (height * spriteScale * (designConfig.content.width / 2)) *
            (car.displayScale * this.track.roadWidth);

        const destX = spriteX + (destW * -0.5);
        const destY = spriteY + (destH * -1);

        const clipH = segment.clip ? Math.max(0, destY + destH - segment.clip) : 0;

        if (clipH < destH) {
            car.x = destX;
            car.y = destY;
            car.zIndex = drawDistance - segmentDistance + carIndex;
            car.scale.set(destW / width);
            car.visible = true;
        }
    }

    private updateCarTexture(car: CarEntity, segment: ISegment): void {
        if (!this.track || !car || !car.spriteNum) return;

        let averageCurve = segment.curve;
        const segmentsToAverage = 3;

        for (let i = 1; i < segmentsToAverage; i++) {
            const nextSegment = this.track.segments[(segment.index + i) % this.track.segments.length];
            averageCurve += nextSegment.curve;
        }
        averageCurve /= segmentsToAverage;

        if (averageCurve < -5) car.targetSteeringState = -2;
        else if (averageCurve < -1) car.targetSteeringState = -1;
        else if (averageCurve > 5) car.targetSteeringState = 2;
        else if (averageCurve > 1) car.targetSteeringState = 1;
        else car.targetSteeringState = 0;

        car.currentSteeringState += (car.targetSteeringState - car.currentSteeringState) * car.STEERING_SMOOTHING;

        const upDown = segment.p2.world.y - segment.p1.world.y;
        let textureName = '';

        if (car.currentSteeringState < -1.5) {
            textureName = upDown > 0 ?
                `car-${car.spriteNum}-uphill-left-hard` :
                `car-${car.spriteNum}-left-hard`;
        } else if (car.currentSteeringState < -0.5) {
            textureName = upDown > 0 ?
                `car-${car.spriteNum}-uphill-left` :
                `car-${car.spriteNum}-left`;
        } else if (car.currentSteeringState > 1.5) {
            textureName = upDown > 0 ?
                `car-${car.spriteNum}-uphill-right-hard` :
                `car-${car.spriteNum}-right-hard`;
        } else if (car.currentSteeringState > 0.5) {
            textureName = upDown > 0 ?
                `car-${car.spriteNum}-uphill-right` :
                `car-${car.spriteNum}-right`;
        } else {
            textureName = upDown > 0 ?
                `car-${car.spriteNum}-uphill` :
                `car-${car.spriteNum}-straight`;
        }

        const texture = this.player.game.getTexture(textureName);
        if (texture) {
            car.texture = texture;
        }
    }
}

export default RacingState;