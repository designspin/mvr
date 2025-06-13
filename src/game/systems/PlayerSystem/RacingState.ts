import { PlayerSystem } from ".";
import { SystemState } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { sound } from "@pixi/sound";
import { accelerate, increase, interpolate, limit, mapToSmaller, overlap, percentRemaining, randomChoice } from "../../../utilities";
import { designConfig } from "../../designConfig";
import { HudSystem } from "../HudSystem";
import { CarSystem } from "../CarSystem/CarSystem";
import { ChampionshipManager } from "../../championship";
import { navigation } from "../../../navigation";
import { RaceResultsScreen } from "../../../screens/RaceResultsScreen";
import { ChampionshipScreen } from "../../../screens/ChampionshipScreen";
import { LapCompletionOverlay } from "../../../screens/overlays/LapCompletionOverlay";

export class RacingState implements SystemState<PlayerSystem> {
    private _totalLaps: number = 3;
    
    // Global race timing
    private _raceStartTime: number = 0;
    private _finishTimes: Map<string, number> = new Map(); // driverId -> finish time

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
        
        // Check if we need to start global race timer (any car starting lap 1)
        if (this._raceStartTime === 0) {
            this.checkGlobalRaceStart(ctx);
        }
        
        if (ctx.racing) {
            ctx.updateLapTime();
        }
        
        this.checkLapComplete(ctx);
        
        // Monitor AI car finishes if player has finished
        if (!ctx.racing && this._raceStartTime > 0) {
            this.monitorAICarFinishes(ctx);
        }
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
            
            if (ctx.lap === -1) {
                // Start global race timer when first car starts racing
                if (this._raceStartTime === 0) {
                    this._raceStartTime = performance.now();
                    console.log('Global race timer started');
                }
                
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
                    // Record player finish time
                    const raceTime = (performance.now() - this._raceStartTime) / 1000;
                    this._finishTimes.set(ctx.driver.id, raceTime);
                    console.log(`Player ${ctx.driver.name} finished race in ${raceTime.toFixed(2)} seconds`);
                    
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

        if (ctx.lap >= this._totalLaps) {
            // Transition to a state that handles the end of the race
        }

        ctx.previousSegment = playerSegment;
    }

    private completeRace(ctx: PlayerSystem) {
        ctx.racing = false; // Disable player controls
        
        const hud = ctx.game.systems.get(HudSystem);
        const carSystem = ctx.game.systems.get(CarSystem);
        
        // Mark player as finished and start showing waiting state
        hud.setPlayerFinished();
        
        // Start monitoring AI cars and showing dynamic results
        this.startWaitingForAICars(ctx, hud, carSystem);
    }

    private collectRaceResults(ctx: PlayerSystem, carSystem: CarSystem): Array<{driverId: string, position: number, lapTime: number, bestLapTime: number}> {
        const results: Array<{driverId: string, position: number, lapTime: number, bestLapTime: number}> = [];
        
        const playerTotalTime = ctx.lapTimes.reduce((sum, time) => sum + time, 0);
        const playerBestLapTime = Math.min(...ctx.lapTimes);
        
        const aiDrivers = carSystem.cars.filter((car: any) => car.driver);
        const allRacers = [...aiDrivers, ctx];
        
        // Create array with actual finish times
        const racerTimes: Array<{racer: any, finishTime: number, bestLapTime: number}> = [];
        
        allRacers.forEach((racer) => {
            let finishTime: number;
            let bestLapTime: number;
            
            if (racer === ctx) {
                // Player: use actual recorded finish time or fall back to lap times
                finishTime = this._finishTimes.get(ctx.driver.id) || playerTotalTime;
                bestLapTime = playerBestLapTime;
            } else {
                const car = racer as any;
                const driver = car.driver;
                
                // AI car: use actual recorded finish time if available
                if (this._finishTimes.has(driver.id)) {
                    finishTime = this._finishTimes.get(driver.id)!;
                } else {
                    // Fallback: estimate time for cars that didn't finish
                    const averageLapTime = playerTotalTime / this._totalLaps;
                    const remainingLaps = Math.max(0, this._totalLaps - car.lap);
                    const estimatedLapTime = averageLapTime * 1.1; // AI slightly slower
                    finishTime = playerTotalTime + (remainingLaps * estimatedLapTime) + (Math.random() * 10);
                    console.log(`AI car ${driver.name} didn't finish, estimated time: ${finishTime.toFixed(2)}s`);
                }
                
                // Estimate best lap time based on overall performance
                const performanceFactor = finishTime / (this._totalLaps * (playerTotalTime / this._totalLaps));
                bestLapTime = playerBestLapTime * performanceFactor;
            }
            
            racerTimes.push({
                racer: racer,
                finishTime: finishTime,
                bestLapTime: bestLapTime
            });
        });
        
        // Sort by actual finish times to get correct final positions
        racerTimes.sort((a, b) => a.finishTime - b.finishTime);
        
        console.log(`Final race results sorted by actual finish time:`);
        racerTimes.forEach((result, index) => {
            const racerName = result.racer === ctx ? ctx.driver?.name : result.racer.driver?.name;
            const minutes = Math.floor(result.finishTime / 60);
            const seconds = (result.finishTime % 60).toFixed(2);
            console.log(`Position ${index + 1}: ${racerName} - ${minutes}:${seconds.padStart(5, '0')}`);
        });
        
        // Create final results with correct positions based on finish times
        racerTimes.forEach((result, index) => {
            results.push({
                driverId: result.racer === ctx ? ctx.driver!.id : result.racer.driver.id,
                position: index + 1, // Position based on actual finish time
                lapTime: result.finishTime,
                bestLapTime: result.bestLapTime
            });
        });
        
        return results;
    }

    private startWaitingForAICars(ctx: PlayerSystem, hud: HudSystem, carSystem: CarSystem) {
        const totalLaps = this._totalLaps;
        
        // Show the dynamic results immediately when player finishes
        const initialRemainingCars = carSystem.cars.filter((car: any) => car.driver && car.lap < totalLaps).length;
        hud.showDynamicResults(this.getCurrentRaceOrder(ctx, carSystem), initialRemainingCars);
        
        // Start checking every second for AI car completions
        const checkInterval = setInterval(() => {
            const aiCars = carSystem.cars.filter((car: any) => car.driver);
            
            // Check for newly finished AI cars and record their times
            aiCars.forEach((car: any) => {
                if (car.lap >= totalLaps && !this._finishTimes.has(car.driver.id)) {
                    const raceTime = (performance.now() - this._raceStartTime) / 1000;
                    this._finishTimes.set(car.driver.id, raceTime);
                    console.log(`AI car ${car.driver.name} finished race in ${raceTime.toFixed(2)} seconds`);
                    
                    // Update immediately when a car finishes - use updateDynamicResults for efficiency!
                    const remainingCars = aiCars.filter((car: any) => car.lap < totalLaps);
                    hud.updateDynamicResults(this.getCurrentRaceOrder(ctx, carSystem), remainingCars.length);
                }
            });
            
            const remainingCars = aiCars.filter((car: any) => car.lap < totalLaps);
            
            console.log(`Race monitoring: ${remainingCars.length} AI cars still racing`);
            
            // Show waiting message for remaining drivers
            if (remainingCars.length > 0) {
                // Don't show separate waiting message - it's now in the board title
            } else {
                // All cars finished, proceed to final results
                console.log(`All AI cars finished, showing final results`);
                clearInterval(checkInterval);
                hud.hideDynamicResults();
                this.showFinalResults(ctx, carSystem);
            }
        }, 1000); // Check every second
    }

    private showFinalResults(ctx: PlayerSystem, carSystem: CarSystem) {
        const championshipManager = ChampionshipManager.getInstance();
        
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

    private checkGlobalRaceStart(ctx: PlayerSystem) {
        // Check if any AI car has started lap 1 (lap >= 0) to start global race timer
        const carSystem = ctx.game.systems.get(CarSystem);
        
        // Check if player is starting lap 1
        if (ctx.lap >= 0) {
            this._raceStartTime = performance.now();
            console.log('Global race timer started by player');
            return;
        }
        
        // Check if any AI car is starting lap 1
        for (const car of carSystem.cars) {
            if (car.lap >= 0) {
                this._raceStartTime = performance.now();
                console.log('Global race timer started by AI car');
                return;
            }
        }
    }

    private monitorAICarFinishes(ctx: PlayerSystem) {
        const carSystem = ctx.game.systems.get(CarSystem);

        for (const car of carSystem.cars) {
            if (car.driver && car.lap >= this._totalLaps && !this._finishTimes.has(car.driver.id)) {
                // This AI car has finished the race
                const finishTime = (performance.now() - this._raceStartTime) / 1000;
                this._finishTimes.set(car.driver.id, finishTime);
                console.log(`AI car ${car.driver.name} finished race in ${finishTime.toFixed(2)} seconds`);
            }
        }
    }

    private getCurrentRaceOrder(ctx: PlayerSystem, carSystem: CarSystem): Array<{racerId: string, driverName: string, position: number, finishTime: number}> {
        const results: Array<{racerId: string, driverName: string, position: number, finishTime: number}> = [];
        
        const aiDrivers = carSystem.cars.filter((car: any) => car.driver);
        const allRacers = [...aiDrivers, ctx];
        
        // Create array with finish times (actual or estimated)
        const racerData: Array<{racer: any, finishTime: number, driverName: string, racerId: string}> = [];
        
        allRacers.forEach((racer) => {
            let finishTime: number;
            let driverName: string;
            let racerId: string;
            
            if (racer === ctx) {
                driverName = ctx.driver?.name || "Player";
                racerId = ctx.driver?.id || "player";
                // Use actual recorded finish time if available, otherwise 0 if still racing
                finishTime = this._finishTimes.get(racerId) || (racer.lap >= this._totalLaps ? ctx.lapTimes.reduce((sum, time) => sum + time, 0) : 0);
            } else {
                const car = racer as any;
                driverName = car.driver?.name || `AI ${car.spriteNum}`;
                racerId = car.driver?.id || `ai-${car.spriteNum}`;
                
                if (this._finishTimes.has(racerId)) {
                    // Car has finished - use recorded time
                    finishTime = this._finishTimes.get(racerId)!;
                } else if (car.lap >= this._totalLaps) {
                    // Car just finished but time not recorded yet - estimate
                    const raceTime = (performance.now() - this._raceStartTime) / 1000;
                    finishTime = raceTime;
                } else {
                    // Car still racing
                    finishTime = 0;
                }
            }
            
            racerData.push({
                racer,
                finishTime,
                driverName,
                racerId
            });
        });
        
        // Sort by finish time, with unfinished cars (finishTime = 0) at the end
        racerData.sort((a, b) => {
            if (a.finishTime === 0 && b.finishTime === 0) {
                // Both still racing - sort by race position
                return a.racer.racePosition - b.racer.racePosition;
            } else if (a.finishTime === 0) {
                return 1; // a is still racing, put at end
            } else if (b.finishTime === 0) {
                return -1; // b is still racing, put at end
            } else {
                return a.finishTime - b.finishTime; // Sort by actual finish time
            }
        });
        
        // Create final results with correct positions
        racerData.forEach((data, index) => {
            results.push({
                racerId: data.racerId,
                driverName: data.driverName,
                position: index + 1,
                finishTime: data.finishTime
            });
        });
        
        return results;
    }
}