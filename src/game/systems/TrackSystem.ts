import { Container, Graphics } from "pixi.js";
import { System } from "../SystemRunner";
import { Game, designConfig } from "../";
import { gameConfig } from "../gameConfig";
import { 
    ISegment, 
    exponentialFog, 
    interpolate, 
    percentRemaining, 
    project, 
    renderSegment, 
    COLORS, 
    toInt,
    easeIn,
    easeInOut,
    reverseZIndex,
} from "../../utilities";
import { HudSystem } from "./HudSystem";
import { PlayerSystem } from "./PlayerSystem";
import { renderStartLineSegment, renderStartPositionSegment } from "../../utilities/graphicsHelpers";

const ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 },
};

export class TrackSystem implements System
{
    public static SYSTEM_ID = 'track';
    public game!: Game;
    public view = new Container();
    public maxIndex:number = 0;
    private _segmentGraphics: Array<Graphics> = [];
    private _segments = Array<ISegment>();
    private _trackLength = 0;
   

    get segmentLength()
    {
        return gameConfig.trackData.level1.segLength;
    }

    get trackLength()
    {
        return this._trackLength;
    }

    get segments()
    {
        return this._segments;
    }

    get roadWidth()
    {
        return gameConfig.trackData.level1.roadWidth;
    }

    public init()
    {   
        this.view.sortableChildren = true;
        this.game.stage.addChild(this.view);
        this.resetRoad();

        for(let n = 0; n < this.game.camera.drawDistance; n++) {
            this._segmentGraphics[n] = new Graphics();
            this.view.addChild(this._segmentGraphics[n]);
        }
    }

    public awake()
    {
    }

    public update()
    {
        this.renderTrack();
    }

    public end()
    {
        const hud = this.game.systems.get(HudSystem);

        hud.signals.onTouchJoystickMove.disconnectAll();
        hud.signals.onTouchJoystickEnd.disconnectAll();
    }

    private renderTrack()
    {
        const player = this.game.systems.get(PlayerSystem);

        const baseSegment = this.findSegment(this.game.camera.position);
        const basePercent = percentRemaining(this.game.camera.position, this.segmentLength);
        const playerSegment = this.findSegment(this.game.camera.position + player.Z);

        const playerPercent = percentRemaining(
            this.game.camera.position + player.Z,
            this.segmentLength
        );
        
        player.Y = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
        let maxY = designConfig.content.height;
        let x = 0;
        let dx = - (baseSegment.curve * basePercent);

        let n: number, segment: ISegment;

        for(n = 0; n < this.game.camera.drawDistance; n++) {
            this._segmentGraphics[n].clear();
            
            segment = this._segments[(baseSegment.index + n) % this._segments.length];
            this._segmentGraphics[n].zIndex = reverseZIndex(n, this.game.camera.drawDistance-1);
            segment.looped = segment.index < baseSegment.index;
            segment.fog = exponentialFog(n / this.game.camera.drawDistance, this.game.camera.fogDensity);
            segment.clip = maxY;

            project(
                segment.p1,
                player.X * this.roadWidth - x,
                player.Y + this.game.camera.height,
                this.game.camera.position - (segment.looped ? this.trackLength : 0),
                this.game.camera.depth,
                designConfig.content.width,
                designConfig.content.height,
                this.roadWidth
            );
            
            project(
                segment.p2,
                player.X * this.roadWidth - x - dx,
                player.Y + this.game.camera.height,
                this.game.camera.position - (segment.looped ? this.trackLength : 0),
                this.game.camera.depth,
                designConfig.content.width,
                designConfig.content.height,
                this.roadWidth
            );

            x = x + dx;
            dx = dx + segment.curve;

            if(
                segment.p1.camera.z <= this.game.camera.depth || // behind us
                segment.p2.screen.y >= segment.p1.screen.y || // back face cull
                segment.p2.screen.y >= maxY) { // clip by (already rendered) segment
                continue;
            }

            if(segment.isStartLineSegment) {
                
                renderStartLineSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    gameConfig.trackData.level1.lanes,
                    segment.isStartLineSegment)
            }
            else if(segment.isStartPositionSegment) {
                renderStartPositionSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    gameConfig.trackData.level1.lanes
                );
            }
            else
            {            
                renderSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    gameConfig.trackData.level1.lanes
                );
            }
            
            maxY = segment.p1.screen.y;
        }
    }

    findSegment(z: number): ISegment
    {
        return this._segments[Math.floor(z / this.segmentLength) % this._segments.length];
    }

    lastY()
    {
        return (this._segments.length === 0) ? 0 : this._segments[this._segments.length - 1].p2.world.y;
    }

    private resetRoad()
    {
        const player = this.game.systems.get(PlayerSystem);

        this._segments = [];
        this.addStraight(ROAD.LENGTH.LONG);
        this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.HARD);
        this.addStraight(ROAD.LENGTH.LONG);
        this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.HARD);
        this.addStraight(ROAD.LENGTH.LONG);
        this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.HARD);
        this.addStraight(ROAD.LENGTH.LONG);
        this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.HARD);
        
        // this.addStraight(ROAD.LENGTH.SHORT);
        // this.addLowRollingHills();
        // this.addSCurves();
        // this.addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
        // this.addBumps();
        // this.addLowRollingHills();
        // this.addCurve(ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
        // this.addStraight();
        // this.addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
        // this.addSCurves();
        // this.addCurve(ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
        // this.addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
        // this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
        // this.addBumps();
        // this.addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
        // this.addStraight();
        // this.addSCurves();
        // this.addDownhillToEnd();

        const startLineSegment1 = this._segments[this.findSegment(player.Z).index + 30];
        const startLineSegment2 = this._segments[this.findSegment(player.Z).index + 29];
        const startLineSegment3 = this._segments[this.findSegment(player.Z).index + 28];
        const startLineSegment4 = this._segments[this.findSegment(player.Z).index + 27];

        const startPosition1 = this._segments[this.findSegment(player.Z).index + 25];
        const startPosition2 = this._segments[this.findSegment(player.Z).index + 20];
        const startPosition3 = this._segments[this.findSegment(player.Z).index + 15];
        const startPosition4 = this._segments[this.findSegment(player.Z).index + 10];
        const startPosition5 = this._segments[this.findSegment(player.Z).index + 5];
        const startPosition6 = this._segments[this.findSegment(player.Z).index];

        startLineSegment1.color = COLORS.START;
        startLineSegment2.color = COLORS.START;
        startLineSegment3.color = COLORS.START;
        startLineSegment4.color = COLORS.START;

        startLineSegment1.isStartLineSegment = "even";
        startLineSegment2.isStartLineSegment = "odd";
        startLineSegment3.isStartLineSegment = "even";
        startLineSegment4.isStartLineSegment = "odd";

        startPosition1.isStartPositionSegment = true;
        startPosition2.isStartPositionSegment = true;
        startPosition3.isStartPositionSegment = true;
        startPosition4.isStartPositionSegment = true;
        startPosition5.isStartPositionSegment = true;
        startPosition6.isStartPositionSegment = true;
        
        for(let n = 0; n < gameConfig.trackData.level1.rumbleLength; n++) {
            this._segments[this._segments.length - 1 - n].color = COLORS.FINISH;
        }
        this._trackLength = this._segments.length * this.segmentLength;

        this.maxIndex = this._segments.length - 1;//this._segments.reduce((prev, curr) => prev.index > curr.index ? prev : curr).index;
    }

    private addSegment(curve: number, y: number)
    {
        const n = this._segments.length;

        this._segments.push({
            index: n,
            p1: {
                world: { x: 0, y: this.lastY(), z: n * this.segmentLength },
                camera: { x: 0, y: 0, z: 0 },
                screen: { x: 0, y: 0, width: 0, scale: 0 },
            },
            p2: {
                world: { x: 0, y: y, z: (n + 1) * this.segmentLength },
                camera: { x: 0, y: 0, z: 0 },
                screen: { x: 0, y: 0, width: 0, scale: 0 },
            },
            curve: curve,
            color: Math.floor(n / gameConfig.trackData.level1.rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT,
        });
    }

    private addRoad(enter: number, hold: number, leave: number, curve: number, y: number)
    {
        const startY = this.lastY();
        const endY = startY + toInt(y, 0) * this.segmentLength;
        let n: number;
        const total: number = enter + hold + leave;
        for (n = 0; n < enter; n++) this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
        for (n = 0; n < hold; n++) this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
        for (n = 0; n < leave; n++)
            this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }

    private addStraight(num?: number)
    {
        num = num || ROAD.LENGTH.MEDIUM;
        this.addRoad(num, num, num, 0, 0);
    }

    // private addHill(num?: number, height?: number)
    // {
    //     num = num || ROAD.LENGTH.MEDIUM;
    //     height = height || ROAD.HILL.MEDIUM;
    //     this.addRoad(num, num, num, 0, height);
    // }

    private addCurve(num?: number, curve?: number, height?: number)
    {
        num = num || ROAD.LENGTH.MEDIUM;
        curve = curve || ROAD.CURVE.MEDIUM;
        height = height || ROAD.HILL.NONE;
        this.addRoad(num, num, num, curve, height);
    }

    // private addLowRollingHills(num?: number, height?: number)
    // {
    //     num = num || ROAD.LENGTH.SHORT;
    //     height = height || ROAD.HILL.LOW;
    //     this.addRoad(num, num, num, 0, height / 2);
    //     this.addRoad(num, num, num, 0, -height);
    //     this.addRoad(num, num, num, ROAD.CURVE.EASY, height);
    //     this.addRoad(num, num, num, 0, 0);
    //     this.addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
    //     this.addRoad(num, num, num, 0, 0);
    // }

    // private addSCurves()
    // {
    //     this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.NONE);
    //     this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    //     this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.LOW);
    //     this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.MEDIUM);
    //     this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.MEDIUM);
    // }

    // private addBumps()
    // {
    //     this.addRoad(10, 10, 10, 0, 5);
    //     this.addRoad(10, 10, 10, 0, -2);
    //     this.addRoad(10, 10, 10, 0, -5);
    //     this.addRoad(10, 10, 10, 0, 8);
    //     this.addRoad(10, 10, 10, 0, 5);
    //     this.addRoad(10, 10, 10, 0, -7);
    //     this.addRoad(10, 10, 10, 0, 5);
    //     this.addRoad(10, 10, 10, 0, -2);
    // }

    // private addDownhillToEnd(num?: number)
    // {
    //     num = num || 200;
    //     this.addRoad(num, num, num, -ROAD.CURVE.EASY, -this.lastY() / this.segmentLength);
    // }
}