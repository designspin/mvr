import { Assets, Container, Graphics } from "pixi.js";
import { System } from "../SystemRunner";
import { Game, designConfig } from "../";
import { Signal } from "typed-signals";
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

interface TrackCorner {
    startIdx: number;
    endIdx: number;
    length: number;
    direction: number;
    sharpness: number;
    distanceToNext?: number; // Optional since it's added later
}

interface TrackData {
    name: string,
    roadWidth: number,
    segLength: number,
    rumbleLength: number,
    lanes: number,
    colors?: {
        sky?: number,
        tree?: number,
        fog?: number,
        light?: {
            road?: number,
            grass?: number,
            rumble?: number,
            lane?: number
        },
        dark?: {
            road?: number,
            grass?: number,
            rumble?: number,
            lane?: number
        },
        start?: {
            road?: number,
            grass?: number,
            rumble?: number,
            lane?: number
        },
        finish?: {
            road?: number,
            grass?: number,
            rumble?: number,
            lane?: number
        }
    },
    track: { func: string, params: number[] }[]
}

export class TrackSystem implements System {
    public static SYSTEM_ID = 'track';
    public game!: Game;
    public view = new Container();
    public maxIndex: number = 0;
    private _segmentGraphics: Array<Graphics> = [];
    private _segments = Array<ISegment>();
    private _trackLength = 0;
    private _trackData!: TrackData;

    public debugRacingLine: boolean = true;

    public signals = {
        onTrackReady: new Signal<() => void>()
    }

    public trackReady: boolean = false;

    get segmentLength() {
        return this._trackData.segLength;
    }

    get trackLength() {
        return this._trackLength;
    }

    get segments() {
        return this._segments;
    }

    get roadWidth() {
        return this._trackData.roadWidth;
    }

    private async loadTrackData() {
        try {
            const trackData = await Assets.load<TrackData>(`tracks/track${this.game.level}.json`);
            this._trackData = trackData;
            this.trackReady = true;

        } catch (error) {
            console.error("Failed to load track data:", error);
            throw new Error("Track data could not be loaded.");
        }
    }

    public getTrackDefinition(): TrackData["track"] {
        return this._trackData.track;
    }

    public getTrackColors() {
        const defaultColors = COLORS;
        const trackColors = this._trackData.colors;
        
        if (!trackColors) {
            return defaultColors;
        }

        return {
            SKY: trackColors.sky ?? defaultColors.SKY,
            TREE: trackColors.tree ?? defaultColors.TREE,
            FOG: trackColors.fog ?? defaultColors.FOG,
            LIGHT: {
                road: trackColors.light?.road ?? (defaultColors.LIGHT as any).road,
                grass: trackColors.light?.grass ?? (defaultColors.LIGHT as any).grass,
                rumble: trackColors.light?.rumble ?? (defaultColors.LIGHT as any).rumble,
                lane: trackColors.light?.lane ?? (defaultColors.LIGHT as any).lane
            },
            DARK: {
                road: trackColors.dark?.road ?? (defaultColors.DARK as any).road,
                grass: trackColors.dark?.grass ?? (defaultColors.DARK as any).grass,
                rumble: trackColors.dark?.rumble ?? (defaultColors.DARK as any).rumble,
                lane: trackColors.dark?.lane ?? (defaultColors.DARK as any).lane
            },
            START: {
                road: trackColors.start?.road ?? (defaultColors.START as any).road,
                grass: trackColors.start?.grass ?? (defaultColors.START as any).grass,
                rumble: trackColors.start?.rumble ?? (defaultColors.START as any).rumble,
                lane: trackColors.start?.lane ?? (defaultColors.START as any).lane
            },
            FINISH: {
                road: trackColors.finish?.road ?? (defaultColors.FINISH as any).road,
                grass: trackColors.finish?.grass ?? (defaultColors.FINISH as any).grass,
                rumble: trackColors.finish?.rumble ?? (defaultColors.FINISH as any).rumble,
                lane: trackColors.finish?.lane ?? (defaultColors.FINISH as any).lane
            }
        };
    }

    public async init() {
        this.view.sortableChildren = true;
        this.game.stage.addChild(this.view);

        for (let n = 0; n < this.game.camera.drawDistance; n++) {
            this._segmentGraphics[n] = new Graphics();
            this.view.addChild(this._segmentGraphics[n]);
        }
    }

    public async awake() {
        await this.loadTrackData();
        this.resetRoad();

        this.trackReady = true;
    }

    public update() {
        this.renderTrack();
    }

    public end() {
        const hud = this.game.systems.get(HudSystem);

        hud.signals.onTouchJoystickMove.disconnectAll();
        hud.signals.onTouchJoystickEnd.disconnectAll();
    }

    private renderTrack() {
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

        for (n = 0; n < this.game.camera.drawDistance; n++) {
            this._segmentGraphics[n].clear();

            segment = this._segments[(baseSegment.index + n) % this._segments.length];
            this._segmentGraphics[n].zIndex = reverseZIndex(n, this.game.camera.drawDistance - 1);
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

            if (
                segment.p1.camera.z <= this.game.camera.depth || // behind us
                segment.p2.screen.y >= segment.p1.screen.y || // back face cull
                segment.p2.screen.y >= maxY) { // clip by (already rendered) segment
                continue;
            }

            if (segment.isStartLineSegment) {

                renderStartLineSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    this._trackData.lanes,
                    segment.isStartLineSegment)
            }
            else if (segment.isStartPositionSegment) {
                renderStartPositionSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    this._trackData.lanes
                );
            }
            else {
                const nextSegment = this._segments[(baseSegment.index + n + 1) % this._segments.length];

                const racingOffset = this.debugRacingLine ? segment.racingLineOffset : undefined;
                const nextOffset = this.debugRacingLine ? nextSegment.racingLineOffset : undefined;

                renderSegment(
                    this._segmentGraphics[n],
                    segment.p1,
                    segment.p2,
                    segment.fog,
                    segment.color,
                    this._trackData.lanes,
                    racingOffset,
                    nextOffset
                );
            }

            maxY = segment.p1.screen.y;
        }
    }

    findSegment(z: number): ISegment {
        return this._segments[Math.floor(z / this.segmentLength) % this._segments.length];
    }

    lastY() {
        return (this._segments.length === 0) ? 0 : this._segments[this._segments.length - 1].p2.world.y;
    }

    private resetRoad() {
        this._segments = [];

        for (let i = 0; i < this._trackData.track.length; i++) {
            const trackSegment = this._trackData.track[i];
            if (typeof this[trackSegment.func as keyof TrackSystem] === 'function') {
                if (trackSegment.params) {
                    (this[trackSegment.func as keyof TrackSystem] as Function)(...trackSegment.params);
                } else {
                    (this[trackSegment.func as keyof TrackSystem] as Function)();
                }
            } else {
                console.error(`Function ${trackSegment.func} does not exist in TrackSystem`);
            }
        }

        const trackColors = this.getTrackColors();
        
        const finishLineSegment = this._segments[0];
        finishLineSegment.isFinishMarker = true;
        finishLineSegment.color = trackColors.START;
        finishLineSegment.isStartLineSegment = "even";

        this._segments[1].color = trackColors.START;
        this._segments[1].isStartLineSegment = "odd";
        this._segments[2].color = trackColors.START;
        this._segments[2].isStartLineSegment = "even";
        this._segments[3].color = trackColors.START;
        this._segments[3].isStartLineSegment = "odd";

        const lastSegment = this._segments.length - 1;

        this._segments[lastSegment - 5].isStartPositionSegment = true;
        this._segments[lastSegment - 10].isStartPositionSegment = true;
        this._segments[lastSegment - 15].isStartPositionSegment = true;
        this._segments[lastSegment - 20].isStartPositionSegment = true;
        this._segments[lastSegment - 25].isStartPositionSegment = true;
        this._segments[lastSegment - 30].isStartPositionSegment = true;

        this.calculateRacingLine();

        this._trackLength = this._segments.length * this.segmentLength;

        this.maxIndex = this._segments.length - 1;//this._segments.reduce((prev, curr) => prev.index > curr.index ? prev : curr).index;
    }

    private addSegment(curve: number, y: number) {
        const n = this._segments.length;
        const trackColors = this.getTrackColors();

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
            color: Math.floor(n / this._trackData.rumbleLength) % 2 ? trackColors.DARK : trackColors.LIGHT,
        });
    }

    private addRoad(enter: number, hold: number, leave: number, curve: number, y: number) {
        const startY = this.lastY();
        const endY = startY + toInt(y, 0) * this.segmentLength;
        let n: number;
        const total: number = enter + hold + leave;
        for (n = 0; n < enter; n++) this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
        for (n = 0; n < hold; n++) this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
        for (n = 0; n < leave; n++)
            this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }

    // @ts-expect-error Used dynamically by track loader
    private addStraight(num?: number) {
        num = num || ROAD.LENGTH.MEDIUM;
        this.addRoad(num, num, num, 0, 0);
    }

    // @ts-expect-error Used dynamically by track loader
    private addHill(num?: number, height?: number) {
        num = num || ROAD.LENGTH.MEDIUM;
        height = height || ROAD.HILL.MEDIUM;
        this.addRoad(num, num, num, 0, height);
    }

    // @ts-expect-error Used dynamically by track loader
    private addCurve(num?: number, curve?: number, height?: number) {
        num = num || ROAD.LENGTH.MEDIUM;
        curve = curve || ROAD.CURVE.MEDIUM;
        height = height || ROAD.HILL.NONE;
        this.addRoad(num, num, num, curve, height);
    }

    // @ts-expect-error Used dynamically by track loader
    private addLowRollingHills(num?: number, height?: number) {
        num = num || ROAD.LENGTH.SHORT;
        height = height || ROAD.HILL.LOW;
        this.addRoad(num, num, num, 0, height / 2);
        this.addRoad(num, num, num, 0, -height);
        this.addRoad(num, num, num, ROAD.CURVE.EASY, height);
        this.addRoad(num, num, num, 0, 0);
        this.addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
        this.addRoad(num, num, num, 0, 0);
    }

    // @ts-expect-error Used dynamically by track loader
    private addSCurves() {
        this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.NONE);
        this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
        this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.LOW);
        this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.MEDIUM);
        this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.MEDIUM);
    }

    // @ts-expect-error Used dynamically by track loader
    private addBumps() {
        this.addRoad(10, 10, 10, 0, 5);
        this.addRoad(10, 10, 10, 0, -2);
        this.addRoad(10, 10, 10, 0, -5);
        this.addRoad(10, 10, 10, 0, 8);
        this.addRoad(10, 10, 10, 0, 5);
        this.addRoad(10, 10, 10, 0, -7);
        this.addRoad(10, 10, 10, 0, 5);
        this.addRoad(10, 10, 10, 0, -2);
    }

    // @ts-expect-error Used dynamically by track loader
    private addDownhillToEnd(num?: number) {
        num = num || 200;
        this.addRoad(num, num, num, -ROAD.CURVE.EASY, -this.lastY() / this.segmentLength);
    }

    public reset() {
        for (const segment of this._segments) {
            if (segment.cars && segment.cars.length > 0) {
                segment.cars = [];
            }
        }

        for (const graphic of this._segmentGraphics) {
            graphic.clear();
        }

        if (this.game && this.game.camera) {
            this.game.camera.position = 0;
        }

        this.resetRoad();

        this.signals.onTrackReady.emit();
    }

    private calculateRacingLine() {
        const corners: TrackCorner[] = [];
        let inCorner = false;
        let cornerStart = 0;
        let cornerDir = 0;

        // Find all corners and their properties
        for (let i = 0; i < this._segments.length; i++) {
            const curve = this._segments[i].curve || 0;

            if (!inCorner && Math.abs(curve) > 1.5) {
                inCorner = true;
                cornerStart = i;
                cornerDir = Math.sign(curve);
            }
            else if (inCorner && Math.abs(curve) < 1.5) {
                inCorner = false;
                corners.push({
                    startIdx: cornerStart,
                    endIdx: i - 1,
                    length: i - cornerStart,
                    direction: cornerDir,
                    sharpness: Math.abs(this._segments[cornerStart].curve || 0)
                });
            }
        }

        if (inCorner) {
            corners.push({
                startIdx: cornerStart,
                endIdx: this._segments.length - 1,
                length: this._segments.length - cornerStart,
                direction: cornerDir,
                sharpness: Math.abs(this._segments[cornerStart].curve || 0)
            });
        }

        const keyPoints: { index: number, offset: number }[] = [];

        corners.forEach((corner) => {
            const cornerDir = corner.direction;

             keyPoints.push({
                index: Math.max(0, corner.startIdx - 10),
                offset: -cornerDir * 0.9  // Outside line
            });

            keyPoints.push({
                index: corner.startIdx + Math.floor(corner.length / 2),
                offset: cornerDir * 0.9   // Inside line
            });

            keyPoints.push({
                index: corner.endIdx + 10,
                offset: -cornerDir * 0.9  // Outside line
            });
        });

        keyPoints.sort((a, b) => a.index - b.index);

       for (let i = 0; i < this._segments.length; i++) {
            this._segments[i].racingLineOffset = 0; // Reset
        }

        for (let i = 0; i < keyPoints.length; i++) {
            const p1 = keyPoints[i];
            const p2 = keyPoints[(i + 1) % keyPoints.length];

            let segmentsBetween = (p2.index - p1.index + this._segments.length) % this._segments.length;
            if (segmentsBetween === 0) segmentsBetween = this._segments.length;

            const cp1Offset = p1.offset * 0.8 + p2.offset * 0.2;
            const cp2Offset = p1.offset * 0.2 + p2.offset * 0.8;

            for (let j = 0; j <= segmentsBetween; j++) {
                const idx = (p1.index + j) % this._segments.length;
                const t = j / segmentsBetween;

                const offset = this.cubicBezier(
                    p1.offset,     
                    cp1Offset,    
                    cp2Offset,    
                    p2.offset,     
                    t             
                );

                this._segments[idx].racingLineOffset = offset;
            }
        }

        this.smoothRacingLine(9);
    }

    private cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
        const oneMinusT = 1 - t;
        return (
            oneMinusT * oneMinusT * oneMinusT * p0 +
            3 * oneMinusT * oneMinusT * t * p1 +
            3 * oneMinusT * t * t * p2 +
            t * t * t * p3
        );
    }

    private smoothRacingLine(windowSize: number = 15) {
        const smoothedOffsets = new Array(this._segments.length).fill(0);
        const halfWindow = Math.floor(windowSize / 2);

        for (let i = 0; i < this._segments.length; i++) {
            let sum = 0;
            for (let j = -halfWindow; j <= halfWindow; j++) {
                const idx = (i + j + this._segments.length) % this._segments.length;
                sum += (this._segments[idx].racingLineOffset || 0);
            }
            smoothedOffsets[i] = sum / (windowSize);
        }

        for (let i = 0; i < this._segments.length; i++) {
            this._segments[i].racingLineOffset = smoothedOffsets[i];
        }
    }
}