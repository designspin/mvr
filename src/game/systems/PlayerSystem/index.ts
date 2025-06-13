import { Container, Sprite } from "pixi.js";
import { System, SystemState, SystemStateMachine } from "../../SystemRunner";
import { Game } from "../..";
import { JoystickChangeEvent } from "../../TouchJoystick";
import { ControlButtonChangeEvent } from "../../ControlButton";
import { HudSystem } from "../HudSystem";
import { TrackSystem } from "../TrackSystem";
import { ISegment } from "../../../utilities";
import { ObjectSystem } from "../ObjectSystem/ObjectsSystem";
import Keyboard from '../../keyboard';
import { sound } from "@pixi/sound";
import { IRacer } from "../../../utilities/IRacer";
import { WaitingState } from "./WaitingState";


export class PlayerSystem implements System, IRacer, SystemStateMachine<PlayerSystem> {
    public static SYSTEM_ID = 'player';
    public static imageNo = "01";
    public game!: Game;

    public view = new Container();

    private _player = new Container();
    private _percent:number = 0;
    public sprite: Sprite = new Sprite();
    public shadow: Sprite = new Sprite();
    public racing: boolean = false;
    public lap: number = -1; // Start at -1, becomes 0 when starting lap 1
    private _totalRaceDistance: number = 0;

    // Lap timing functionality
    public lapTimes: number[] = [];
    private _currentLapStartTime: number = 0;
    public driver: { id: string; name: string } = { id: "player", name: "Player" };

    public X = 0.7;
    public Y = 0;

    private _speed = 0;
    public movementData: JoystickChangeEvent | null = null;
    public accelData: ControlButtonChangeEvent | null = null;
    public brakeData: ControlButtonChangeEvent | null = null;
    public keyUp: Keyboard = new Keyboard("ArrowUp");
    public keyDown: Keyboard = new Keyboard("ArrowDown");
    public keyLeft: Keyboard = new Keyboard("ArrowLeft");
    public keyRight: Keyboard = new Keyboard("ArrowRight");
    public keyShift: Keyboard = new Keyboard("Shift");
    public previousSegment: ISegment | null = null;
    private _racePosition: number = 0;
    public currentGear: 'LOW' | 'HIGH' = 'LOW';
    public gearChangeDelay: number = 0;
    public gearChangeRequest: boolean = false;
    public overrevving: boolean = false;

    constructor(private _state: SystemState<PlayerSystem> = new WaitingState()) {}

    setState(state: SystemState<PlayerSystem>) {
        this._state = state;
    }

    getState() {
        return this._state;
    }

    switchState() {
        this._state?.doAction(this);
    }

    get totalRaceDistance(): number {
        return this._totalRaceDistance;
    }

    set totalRaceDistance(value: number) {
        if(isNaN(value)) {
            console.error("Caught NaN value for totalRaceDistance, resetting to 0.", new Error().stack);
            return;
        }

        this._totalRaceDistance = value;
    }

    get percent(): number {
        return this._percent;
    }

    set percent(value: number) {
        this._percent = value;
    }

    get offset(): number {
        return this.X;
    }
    
    set offset(value: number) {
        this.X = value;
    }

    get z() {
        return this.game.camera.position + this.Z;
    }

    get Z() {
        return this.game.camera.height / this.game.camera.depth;
    }

    get racePosition() {
        return this._racePosition
    }

    set racePosition(value: number) {
        this._racePosition = value;
    }

    get maxSpeedLow() {
        const track = this.game.systems.get(TrackSystem);
        return (39 * track.segmentLength );
    }

    get maxSpeedHigh() {
        const track = this.game.systems.get(TrackSystem);
        return (78 * track.segmentLength );
    }

    get maxSpeed() {
        return this.currentGear === 'HIGH' ? this.maxSpeedHigh : this.maxSpeedLow;
    }

    get accelLow() {
        return this.maxSpeedLow / 3;
    }

    get accelHigh() {
        return this.maxSpeedHigh / 5;
    }

    get accel() {
        return this.currentGear === 'HIGH' ? this.accelHigh : this.accelLow;
    }

    get breaking() {
        return -this.maxSpeed;
    }

    get decel() {
        return -this.maxSpeed / 5;
    }

    get offRoadDecel() {
        return -this.maxSpeed / 2;
    }

    get offRoadLimit() {
        return this.maxSpeed / 4;
    }

    get speed() {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    get segment() {
        const track = this.game.systems.get(TrackSystem);
        return track.findSegment(this.game.camera.position + this.Z);
    }

    get scale() {
        return 0.5 * (1 / this.sprite.texture?.width);
    }

    get width() {
        return this.sprite.texture?.width * this.scale;
    }

    get height() {
        return this.sprite.texture?.height * this.scale;
    }

    public init() {
        
    }

    public awake() {
        this.sprite.anchor.set(0.5);
        this.shadow.anchor.set(0.5);
        this.shadow.alpha = 0.3;
        this.shadow.tint = 0x000000;

        const texture = this.game.getTexture(`car-${PlayerSystem.imageNo}-straight`);
        if (texture) {
            this.sprite.texture = texture;
            this.shadow.texture = this.sprite.texture;
        } else {
            throw new Error("Unable to assign texture for player.");
        }

        this.view.addChild(this._player);
        this._player.addChild(this.shadow);
        this._player.addChild(this.sprite);
        this.game.stage.addChild(this.view);

        const track = this.game.systems.get(TrackSystem);
        const startSegmentIndex = track.segments.length - 35;
        this.game.camera.position =  startSegmentIndex * track.segmentLength;
    }

    public start() {
        sound.play('audio/engine-loop.wav', {
            loop: true,
            speed: 0.8,
            volume: 0.2
        });

        if(this.game.isMobileDevice) {
            this.setupInputHandlers();
        }

        const objectSystem = this.game.systems.get(ObjectSystem);
        objectSystem.signals.onLightsReady.connect(() => { 
            this.racing = true;
            this.switchState();
        });
    }

    public end() {
        if(sound.exists('audio/engine-loop.wav')) {
            sound.stop('audio/engine-loop.wav');
        }

        this.racing = false;

        const hud = this.game.systems.get(HudSystem);
        
        if(this.game.isMobileDevice) {
            hud.signals.onTouchJoystickMove.disconnectAll();
            hud.signals.onAccelChange.disconnectAll();
            hud.signals.onBrakeChange.disconnectAll();
            hud.signals.onTouchJoystickEnd.disconnectAll();
        }
    }

    private setupInputHandlers() {
        const hud = this.game.systems.get(HudSystem);

        hud.signals.onTouchJoystickMove.connect((data) => {
            this.movementData = data;
        });

        hud.signals.onAccelChange.connect((data) => {
            this.accelData = data;
        });

        hud.signals.onBrakeChange.connect((data) => {
            this.brakeData = data;
        });

        hud.signals.onTouchJoystickEnd.connect(() => {
            this.movementData = null;
        });

        hud.signals.onGearChange.connect((data) => {
            if (data.state === 'pressed') {
                this.gearChangeRequest = true;
            }
        });
    }

    // private shiftGear() {
    //     if (this._gearChangeDelay > 0) return;

    //     if (this._currentGear === 'LOW' && this._speed > this.maxSpeedLow * 0.8) {
    //         this._currentGear = 'HIGH';
    //         this._overrevving = false;
    //         this._gearChangeDelay = 30;
    //     } else if (this._currentGear === 'HIGH' && this._speed < this.maxSpeedLow * 0.5) {
    //         this._currentGear = 'LOW';
    //         this._overrevving = this._speed > this.maxSpeedLow;
    //         this._gearChangeDelay = 30;
    //     }
    // }

    public update(interpolated: number) {
        this._state.update?.(this, interpolated);
    }

    public fixedUpdate(fixedDelta: number) {
        this._state.fixedUpdate?.(this, fixedDelta);
    }

    reset() {
        this.X = 0.7;
        this.Y = 0;
        this._speed = 0;

        this.racing = false;
        this.lap = -1; // Reset to -1 (before starting lap 1)
        this.racePosition = 0;

        // Reset lap timing
        this.lapTimes = [];
        this._currentLapStartTime = 0;

        this.currentGear = 'LOW';
        this.gearChangeDelay = 0;
        this.overrevving = false;

        this.movementData = null;
        this.accelData = null;
        this.brakeData = null;

        this.previousSegment = null;

        const texture = this.game.getTexture(`car-${PlayerSystem.imageNo}-straight`);
        if (texture) {
            this.sprite.texture = texture;
            this.shadow.texture = this.sprite.texture;
        }
    }

    // Lap timing methods
    public startLapTiming(): void {
        this._currentLapStartTime = performance.now();
        console.log(`Started timing for lap ${this.lap + 1}`);
    }

    public updateLapTime(): void {
        // This method now just exists for compatibility
        // The actual lap time calculation happens in completeLap()
    }

    public completeLap(): number {
        if (this._currentLapStartTime > 0) {
            const lapTime = (performance.now() - this._currentLapStartTime) / 1000;
            this.lapTimes.push(lapTime);
            this._currentLapStartTime = 0;
            console.log(`Completed lap in ${lapTime.toFixed(2)} seconds`);
            return lapTime;
        }
        return 0;
    }

    public getLapTimingData(): { lapNumber: number; lapTime: number; bestLapTime: number; totalTime: number } {
        const totalTime = this.lapTimes.reduce((sum, time) => sum + time, 0);
        const bestLapTime = this.lapTimes.length > 0 ? Math.min(...this.lapTimes) : 0;
        const currentLapTime = this.lapTimes.length > 0 ? this.lapTimes[this.lapTimes.length - 1] : 0;
        
        return {
            lapNumber: this.lap,
            lapTime: currentLapTime,
            bestLapTime: bestLapTime,
            totalTime: totalTime
        };
    }
}