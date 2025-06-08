import { Game } from "../..";
import { System, SystemState, SystemStateMachine } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { gameConfig } from "../../gameConfig";
import Car from "../../entities/Car";
import IdleState from "./IdleState";
import { ObjectSystem } from "../ObjectSystem/ObjectsSystem";

export class CarSystem implements System, SystemStateMachine<CarSystem> {
    public static SYSTEM_ID = 'car';
    public game!: Game;

    public cars: Car[] = [];

    constructor(private _state: SystemState<CarSystem> = new IdleState()) { }

    setState(state: SystemState<CarSystem>) {
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
        this.resetCars();
        const objectSystem = this.game.systems.get(ObjectSystem);
        objectSystem.signals.onLightsReady.connect(() => {
            this.switchState();
        });
    }

    public update(deltaTime: number) {
        this._state.update?.(this, deltaTime);
    }

    public fixedUpdate(fixedDelta: number) {
        this._state.fixedUpdate?.(this, fixedDelta);
    }

    public resetCars() {
        const track = this.game.systems.get(TrackSystem);
        const startPositions = track.segments.filter(s => s.isStartPositionSegment);
        
        
        
    const availableCarSprites = ["02", "03", "04"];
        let spriteIndex = 0;
        let aiCarCount = 0; 

        for (let i = 0; i < startPositions.length; i++) {
            const spriteNum = availableCarSprites[spriteIndex % availableCarSprites.length];
            spriteIndex++;
            
            const car = new Car(spriteNum, this.game, startPositions[i].index * gameConfig.trackData.level1.segLength, -0.7, aiCarCount);
            this.cars.push(car);
            aiCarCount++;
            console.log(`[CarSystem] Created car ${this.cars.length} at position ${i} with sprite ${spriteNum} and driver ${car.driver?.name || 'Unknown'}`);
            
            if (i > 0) {
                const spriteNum2 = availableCarSprites[spriteIndex % availableCarSprites.length];
                spriteIndex++;
                
                const car2 = new Car(spriteNum2, this.game, startPositions[i].index * gameConfig.trackData.level1.segLength, 0.9, aiCarCount);
                this.cars.push(car2);
                aiCarCount++;
                startPositions[i].cars = [car, car2];
                track.view.addChild(car, car2);
            } else {
                startPositions[i].cars = [car];
                track.view.addChild(car);
            }
        }
    }

    public reset() {
        const track = this.game.systems.get(TrackSystem);

        for (const car of this.cars) {
            if (car.parent) {
                car.parent.removeChild(car);
            }
        }

        for (const segment of track.segments) {
            if (segment.cars && segment.cars.length > 0) {
                segment.cars = [];
            }
        }

        this.cars = [];

        this.setState(new IdleState());
    }
}