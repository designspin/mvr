import { Game } from "../..";
import { System, SystemState, SystemStateMachine } from "../../SystemRunner";
import { TrackSystem } from "../TrackSystem";
import { gameConfig } from "../../gameConfig";
import Car from "../../entities/Car";
import IdleState from "./IdleState";
import { ObjectSystem } from "../ObjectSystem/ObjectsSystem";
import { Ticker } from "pixi.js";

export class CarSystem implements System, SystemStateMachine<CarSystem>
{
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

    public init()
    {
        const objectSystem = this.game.systems.get(ObjectSystem);
        objectSystem.signals.onLightsReady.connect(() => {
            this.switchState();
        });
        this.resetCars();
    }

    public update(time: Ticker) {
        this._state.update(this, time.deltaTime);
    }

    public resetCars()
    {
        const track = this.game.systems.get(TrackSystem);
        const startPositions = track.segments.filter(s => s.isStartPositionSegment);
        const spriteNums = ["01", "02", "03", "04"];
        
        for(let i = 0; i < startPositions.length; i++)
        {
            const spriteNum = spriteNums[Math.floor(Math.random() * spriteNums.length)];
            const spriteNum2 = spriteNums[Math.floor(Math.random() * spriteNums.length)];
            const car = new Car(spriteNum, this.game, startPositions[i].index * gameConfig.trackData.level1.segLength, -0.7);
            const car2 = new Car(spriteNum2, this.game, startPositions[i].index * gameConfig.trackData.level1.segLength, 0.9);
            this.cars.push(car);
            if(i > 0) {
                this.cars.push(car2);
                startPositions[i].cars = [car, car2];
                track.view.addChild(car, car2);
            } else {
                startPositions[i].cars = [car];
                track.view.addChild(car);
            }
        }
    }
}