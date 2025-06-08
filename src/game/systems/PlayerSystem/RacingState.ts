import { PlayerSystem } from ".";
import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { sound } from "@pixi/sound";
import { accelerate, increase, interpolate, limit, mapToSmaller, overlap, percentRemaining, randomChoice } from "../../../utilities";
import { designConfig } from "../../designConfig";
import { HudSystem } from "../HudSystem";
import { navigation } from "../../../navigation";
import { LapCompletionOverlay } from "../../../screens/overlays/LapCompletionOverlay";
import { ChampionshipManager } from "../../championship/ChampionshipManager";
import { RaceResultsScreen } from "../../../screens/RaceResultsScreen";
import { ChampionshipScreen } from "../../../screens/ChampionshipScreen";
import { CarSystem } from "../CarSystem/CarSystem";

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
        
        if (ctx.racing) {
            ctx.updateLapTime();
        }
        
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

        ctx.percent = percentRemaining(ctx.z, track.segmentLength);
        ctx.totalRaceDistance = (Math.max(0, ctx.lap + 1) * track.segments.length + playerSegment.index + ctx.percent) * track.segmentLength;

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
            const overrevDecel = ctx.decel * 4;
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
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-uphill-left-hard`] :
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-uphill-left`];
                } else {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-left-hard`] :
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-left`];
                }
            } else if (steer === "right" || steer === "top-right" || steer === "bottom-right") {
                if (upDown > 0) {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-uphill-right-hard`] :
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-uphill-right`];
                } else {
                    ctx.sprite.texture = (power && power > 0.7) ?
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-right-hard`] :
                        ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-right`];
                }
            } else {
                if (upDown > 0) {
                    ctx.sprite.texture = ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-uphill`];
                } else {
                    ctx.sprite.texture = ctx.game.sheet.textures[`car-${PlayerSystem.imageNo}-straight`];
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
        const track = ctx.game.systems.get(TrackSystem);
        
        // High-speed lap detection: check if we've crossed the finish line
        const hasCompletedLap = this.hasPlayerCrossedFinishLine(ctx, track);

        if (hasCompletedLap) {
            // Update previousSegment immediately to prevent continuous triggering
            ctx.previousSegment = playerSegment;
            const hud = ctx.game.systems.get(HudSystem);
            
            if (ctx.lap === -1) {
                ctx.lap = 0; 
                ctx.startLapTiming();
                hud.setLapCount(ctx.lap);
                console.log(`Started lap 1 (0 laps completed)`);
            } else {
                const lapTime = ctx.completeLap();
                ctx.lap++; 
                const completedLapNumber = ctx.lap; 
                
                console.log(`Completed lap ${completedLapNumber} (${ctx.lap}/${this._totalLaps} laps completed)`);
                
                if (ctx.lap >= this._totalLaps && ctx.racing) {
                    console.log(`Race complete! Completed ${ctx.lap} laps out of ${this._totalLaps}`);
                    if (lapTime > 0) {
                        const lapData = ctx.getLapTimingData();
                        lapData.lapNumber = completedLapNumber; 
                        
                        navigation.showOverlay(LapCompletionOverlay, {
                            lapData,
                            callback: () => {
                                navigation.hideOverlay();
                                this.completeRace(ctx);
                            }
                        });
                    } else {
                        this.completeRace(ctx);
                    }
                    return; 
                }
                
                if (lapTime > 0) {
                    const lapData = ctx.getLapTimingData();
                    lapData.lapNumber = completedLapNumber; 
                    
                    navigation.showOverlay(LapCompletionOverlay, {
                        lapData,
                        callback: () => {
                            navigation.hideOverlay();
                        }
                    });
                }
                
                hud.setLapCount(ctx.lap); 
                
                if (ctx.lap < this._totalLaps) {
                    ctx.startLapTiming();
                }
            }
        } else {
            // No lap completion, just update previousSegment for next check
            ctx.previousSegment = playerSegment;
        }
    }

    /**
     * Enhanced lap detection that handles high-speed scenarios.
     * Checks if the player has crossed the finish line even if they didn't land on the exact segment.
     */
    private hasPlayerCrossedFinishLine(ctx: PlayerSystem, track: TrackSystem): boolean {
        const playerSegment = ctx.segment;
        const previousSegment = ctx.previousSegment;
        
        // If we haven't moved to a new segment, no lap completion possible
        if (previousSegment === playerSegment) {
            return false;
        }
        
        // Standard case: player landed exactly on finish line segment
        if (playerSegment.isFinishMarker) {
            return true;
        }
        
        // High-speed case: check if we crossed the finish line between segments
        if (previousSegment && previousSegment.index !== playerSegment.index) {
            const finishLineIndex = 0; // Finish line is always segment 0
            const prevIndex = previousSegment.index;
            const currentIndex = playerSegment.index;
            
            // Handle wrap-around at end of track
            if (prevIndex > currentIndex) {
                // We've wrapped around from end to beginning of track
                // Check if finish line (0) is between previous segment and current segment
                return (finishLineIndex >= 0 && finishLineIndex <= currentIndex) || 
                       (prevIndex < track.segments.length - 1);
            } else {
                // Normal forward progression
                // Check if finish line is between previous and current segment
                return finishLineIndex > prevIndex && finishLineIndex <= currentIndex;
            }
        }
        
        return false;
    }

    private completeRace(ctx: PlayerSystem) {
        ctx.racing = false;
        
        const championshipManager = ChampionshipManager.getInstance();
        
        const carSystem = ctx.game.systems.get(CarSystem);
        
        const raceResults = this.collectRaceResults(ctx, carSystem);
        
        championshipManager.completeRace(raceResults);
        
        const raceResultsData = championshipManager.getLastRaceResults();
        navigation.gotoScreen(RaceResultsScreen, {
            raceResults: raceResultsData,
            callback: () => {
                navigation.gotoScreen(ChampionshipScreen);
            }
        });
    }

    private collectRaceResults(ctx: PlayerSystem, carSystem: CarSystem): Array<{driverId: string, position: number, lapTime: number, bestLapTime: number}> {
        const results: Array<{driverId: string, position: number, lapTime: number, bestLapTime: number}> = [];
        
        const playerTotalTime = ctx.lapTimes.reduce((sum, time) => sum + time, 0);
        const playerBestLapTime = Math.min(...ctx.lapTimes);
        
        const aiDrivers = carSystem.cars.filter((car: any) => car.driver);
        
        const allRacers = [...aiDrivers, ctx];
        
        allRacers.sort((a, b) => {
            return a.racePosition - b.racePosition;
        });
        
        console.log(`Final race positions from race position system:`);
        allRacers.forEach((racer) => {
            const racerName = racer === ctx ? ctx.driver?.name : (racer as any).driver?.name;
            console.log(`Position ${racer.racePosition}: ${racerName} (lap ${racer.lap})`);
        });
        
        const averageLapTime = playerTotalTime / this._totalLaps;
        
        allRacers.forEach((racer) => {
            let finishTime: number;
            let bestLapTime: number;
            const finalPosition = racer.racePosition;
            
            if (racer === ctx) {
                finishTime = playerTotalTime;
                bestLapTime = playerBestLapTime;
            } else {
                const car = racer as any;
                const driver = car.driver;
                
                const aiCompletedRace = car.lap >= this._totalLaps;
                
                const positionGap = finalPosition - ctx.racePosition;
                
                let timeGapPerPosition: number;
                if (Math.abs(positionGap) <= 1) {
                    timeGapPerPosition = 0.5 + Math.random() * 1.0; 
                } else if (Math.abs(positionGap) <= 3) {
                    timeGapPerPosition = 1.0 + Math.random() * 2.0; 
                } else {
                    timeGapPerPosition = 2.0 + Math.random() * 3.0; 
                }
                
                let profileModifier = 1.0;
                switch (driver.aiProfile) {
                    case 'AGGRESSIVE':
                        profileModifier = 0.98 + Math.random() * 0.04; 
                        break;
                    case 'BALANCED':
                        profileModifier = 0.99 + Math.random() * 0.03; 
                        break;
                    case 'CAUTIOUS':
                        profileModifier = 1.01 + Math.random() * 0.03; 
                        break;
                }
                
                if (aiCompletedRace) {
                    if (positionGap < 0) {
                        finishTime = playerTotalTime - (Math.abs(positionGap) * timeGapPerPosition);
                    } else if (positionGap > 0) {
                        finishTime = playerTotalTime + (positionGap * timeGapPerPosition);
                    } else {
                        finishTime = playerTotalTime + (Math.random() - 0.5) * 0.1;
                    }
                    
                    finishTime *= profileModifier;
                    
                    const minimumRaceTime = averageLapTime * this._totalLaps * 0.85;
                    finishTime = Math.max(finishTime, minimumRaceTime);
                } else {
                    const remainingLaps = this._totalLaps - car.lap;
                    const estimatedLapTime = (averageLapTime * profileModifier) * (1.2 + Math.random() * 0.3);
                    finishTime = playerTotalTime + (remainingLaps * estimatedLapTime) + (Math.random() * 10);
                }
                
                const lapTimeModifier = profileModifier * (0.96 + Math.random() * 0.08);
                bestLapTime = playerBestLapTime * lapTimeModifier;
            }
            
            results.push({
                driverId: racer === ctx ? ctx.driver!.id : (racer as any).driver.id,
                position: finalPosition, 
                lapTime: finishTime,
                bestLapTime: bestLapTime
            });
        });
        
        
        results.sort((a, b) => a.position - b.position);
        
        results.forEach(result => {
            let driverName: string;
            if (result.driverId === ctx.driver?.id) {
                driverName = ctx.driver.name;
            } else {
                const aiCar = carSystem.cars.find((car: any) => car.driver?.id === result.driverId);
                driverName = aiCar?.driver?.name || result.driverId;
            }
        });
        
        return results;
    }
}