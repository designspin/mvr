import { Container, Graphics } from "pixi.js";
import { Game } from "..";
import { System } from "../SystemRunner";
import { TrackSystem } from "./TrackSystem";
import { PlayerSystem } from "./PlayerSystem";
import { CarSystem } from "./CarSystem/CarSystem";
import { designConfig } from "..";

const ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 }
};

export class MiniMapSystem implements System {
    public static SYSTEM_ID = 'minimap';
    public game!: Game;
    public view = new Container();

    private _mapGraphics: Graphics;
    private _carDots: Graphics;
    private _playerDot: Graphics;
    private _startMarker: Graphics;

    private _mapSize = 75;
    private _padding = 10;
    private _trackPoints: Array<{ x: number, z: number }> = [];
    private _segmentPoints: Array<{ x: number, z: number }> = []; // NEW: Points for each track segment

    constructor() {
        this._mapGraphics = new Graphics();
        this._carDots = new Graphics();
        this._playerDot = new Graphics();
        this._startMarker = new Graphics();

        this.view.x = (designConfig.content.width / 2) - (this._mapSize / 2);
        this.view.y = this._padding;
    }

    public init() {
        
    }

    public awake() {
        this.calculateTrackShape();
        this.drawTrackOutline();
        this.drawStartMarker();
        this.view.addChild(this._mapGraphics);
        this.view.addChild(this._startMarker);
        this.view.addChild(this._carDots);
        this.view.addChild(this._playerDot);
        this.game.stage.addChild(this.view);
    }

    public update() {
        this.updateCarPositions();
    }

    private drawStartMarker() {
        if (this._segmentPoints.length === 0) return;

        this._startMarker.clear();

        const startPoint = this._segmentPoints[0];

        const nextPoint = this._segmentPoints[1 % this._segmentPoints.length];

        const dx = nextPoint.x - startPoint.x;
        const dz = nextPoint.z - startPoint.z;
        const length = Math.sqrt(dx * dx + dz * dz) || 1;

        const perpX = -dz / length * 4;
        const perpZ = dx / length * 4;

        const dirX = dx / length * 6;
        const dirZ = dz / length * 6;

        this._startMarker.beginFill(0x000000, 1);
        this._startMarker.lineStyle(1, 0xFFFFFF, 0.8);

        this._startMarker.moveTo(startPoint.x - perpX - dirX / 2, startPoint.z - perpZ - dirZ / 2);
        this._startMarker.lineTo(startPoint.x + perpX - dirX / 2, startPoint.z + perpZ - dirZ / 2);
        this._startMarker.lineTo(startPoint.x + perpX + dirX / 2, startPoint.z + perpZ + dirZ / 2);
        this._startMarker.lineTo(startPoint.x - perpX + dirX / 2, startPoint.z - perpZ + dirZ / 2);
        this._startMarker.closePath();

        this._startMarker.endFill();

        this._startMarker.lineStyle(1.5, 0xFFFFFF, 1);
        this._startMarker.moveTo(startPoint.x - perpX - dirX / 2, startPoint.z - perpZ - dirZ / 2);
        this._startMarker.lineTo(startPoint.x + perpX - dirX / 2, startPoint.z + perpZ - dirZ / 2);

        this._startMarker.moveTo(startPoint.x - perpX + dirX / 2, startPoint.z - perpZ + dirZ / 2);
        this._startMarker.lineTo(startPoint.x + perpX + dirX / 2, startPoint.z + perpZ + dirZ / 2);
    }

    private calculateTrackShape() {
        const track = this.game.systems.get(TrackSystem);

        this._trackPoints = [];

        let x = 0;
        let z = 0;
        let direction = 0; 

        this._trackPoints.push({ x, z });

        const segmentFunctions = track.getTrackDefinition();

        if (!segmentFunctions || segmentFunctions.length === 0) {
            this.calculateTrackShapeFromSegments(track);
            return;
        }

        for (const segment of segmentFunctions) {
            const { func, params } = segment;

            const scale = 0.5;

            switch (func) {
                case 'addStraight': {
                    const length = params[0] * scale;
                    x += Math.cos(direction) * length;
                    z += Math.sin(direction) * length;
                    this._trackPoints.push({ x, z });
                    break;
                }
                case 'addCurve': {
                    const length = params[0] * scale;
                    const curve = params[1];
                    const segments = 10;

                    const totalAngle = (curve / 6) * (Math.PI / 2);

                    for (let i = 0; i < segments; i++) {
                        direction += totalAngle / segments;

                        const stepDist = length / segments;
                        x += Math.cos(direction) * stepDist;
                        z += Math.sin(direction) * stepDist;

                        this._trackPoints.push({ x, z });
                    }
                    break;
                }
                case 'addHill': {
                    const length = params[0] * scale;
                    x += Math.cos(direction) * length;
                    z += Math.sin(direction) * length;
                    this._trackPoints.push({ x, z });
                    break;
                }
                case 'addSCurves': {
                    const length = ROAD.LENGTH.MEDIUM * scale;

                    const segments = 8;
                    let totalAngle = (-ROAD.CURVE.MEDIUM / 6) * (Math.PI / 2);

                    for (let i = 0; i < segments; i++) {
                        direction += totalAngle / segments;
                        const stepDist = length / segments;
                        x += Math.cos(direction) * stepDist;
                        z += Math.sin(direction) * stepDist;
                        this._trackPoints.push({ x, z });
                    }

                    totalAngle = (ROAD.CURVE.MEDIUM / 6) * (Math.PI / 2);

                    for (let i = 0; i < segments; i++) {
                        direction += totalAngle / segments;
                        const stepDist = length / segments;
                        x += Math.cos(direction) * stepDist;
                        z += Math.sin(direction) * stepDist;
                        this._trackPoints.push({ x, z });
                    }
                    break;
                }
                default: {
                    const length = ROAD.LENGTH.MEDIUM * scale;
                    x += Math.cos(direction) * length;
                    z += Math.sin(direction) * length;
                    this._trackPoints.push({ x, z });
                    break;
                }
            }
        }

        this.normalizeTrackPoints();

        this.distributePointsAlongTrack(track.segments.length);
    }

    private distributePointsAlongTrack(numSegments: number) {
        if (this._trackPoints.length < 2) return;

        let totalLength = 0;
        const distances = [];

        for (let i = 0; i < this._trackPoints.length; i++) {
            const next = (i + 1) % this._trackPoints.length;
            const dx = this._trackPoints[next].x - this._trackPoints[i].x;
            const dz = this._trackPoints[next].z - this._trackPoints[i].z;
            const segmentLength = Math.sqrt(dx * dx + dz * dz);

            distances.push({
                index: i,
                startDist: totalLength,
                length: segmentLength
            });

            totalLength += segmentLength;
        }

        this._segmentPoints = [];

       for (let i = 0; i < numSegments; i++) {
             const targetDist = (i / numSegments) * totalLength;

            let segmentIndex = 0;
            while (segmentIndex < distances.length - 1 &&
                distances[segmentIndex + 1].startDist <= targetDist) {
                segmentIndex++;
            }

            const segment = distances[segmentIndex];
            const nextIndex = (segmentIndex + 1) % this._trackPoints.length;
            const localDist = targetDist - segment.startDist;
            const fraction = segment.length > 0 ? localDist / segment.length : 0;

            const p1 = this._trackPoints[segment.index];
            const p2 = this._trackPoints[nextIndex];

            this._segmentPoints.push({
                x: p1.x + (p2.x - p1.x) * fraction,
                z: p1.z + (p2.z - p1.z) * fraction
            });
        }

        console.log(`Created ${this._segmentPoints.length} evenly distributed points along track`);
    }

    private normalizeTrackPoints() {
        if (this._trackPoints.length === 0) return;

        let minX = this._trackPoints[0].x;
        let maxX = this._trackPoints[0].x;
        let minZ = this._trackPoints[0].z;
        let maxZ = this._trackPoints[0].z;

        for (const point of this._trackPoints) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        }

        const rangeX = maxX - minX || 1;
        const rangeZ = maxZ - minZ || 1;

        const scale = Math.min(
            (this._mapSize - 20) / rangeX,
            (this._mapSize - 20) / rangeZ
        );

        const centerX = this._mapSize / 2;
        const centerZ = this._mapSize / 2;

        for (let i = 0; i < this._trackPoints.length; i++) {
            const point = this._trackPoints[i];
            this._trackPoints[i] = {
                x: centerX + (point.x - (minX + rangeX / 2)) * scale,
                z: centerZ + (point.z - (minZ + rangeZ / 2)) * scale
            };
        }
    }

    private drawTrackOutline() {
        if (this._trackPoints.length === 0) return;

        this._mapGraphics.clear();

        this._mapGraphics
            .rect(0, 0, this._mapSize, this._mapSize)
            .fill({ color: 0x000000, alpha: 0.6 })

        this._mapGraphics
            .poly(this._trackPoints.map(p => [p.x, p.z]).flat())
            .stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8 })
            .fill({ color: 0xFFFFFF, alpha: 0.1 });
        
    }

    private updateCarPositions() {
        if (this._trackPoints.length === 0 || this._segmentPoints.length === 0) return;

        const track = this.game.systems.get(TrackSystem);
        const player = this.game.systems.get(PlayerSystem);
        const carSystem = this.game.systems.get(CarSystem);

        this._playerDot.clear();
        this._carDots.clear();

        const playerSegmentIndex = player.segment.index;
        const playerOffset = player.X;
        const playerPosition = this.getMapPositionFromSegmentIndex(playerSegmentIndex, playerOffset);

        this._playerDot
            .circle(playerPosition.x, playerPosition.z, 1.5)
            .fill({ color: 0xFF0000, alpha: 1 })

        

        if (carSystem && carSystem.cars) {

            for (const car of carSystem.cars) {
                const carSegmentIndex = Math.floor(car.z / track.segmentLength) % track.segments.length;
                const carPosition = this.getMapPositionFromSegmentIndex(carSegmentIndex, car.offset);

                this._carDots.circle(carPosition.x, carPosition.z, 1.5)
                    .fill({ color: 0x00FF00, alpha: 1 });
            }
        }
    }

    private calculateTrackShapeFromSegments(track: TrackSystem) {
        const segments = track.segments;
        this._trackPoints = [];

        let x = 0;
        let z = 0;
        let direction = 0;

        this._trackPoints.push({ x, z });

        const sampleRate = Math.max(1, Math.floor(segments.length / 100));

        for (let i = 0; i < segments.length; i += sampleRate) {
            const segment = segments[i];

            direction += segment.curve * 0.01;

            const step = 1.0;
            x += Math.cos(direction) * step;
            z += Math.sin(direction) * step;

            this._trackPoints.push({ x, z });
        }

        this.normalizeTrackPoints();

        this.distributePointsAlongTrack(segments.length);
    }

    private getMapPositionFromSegmentIndex(segmentIndex: number, offset: number): { x: number, z: number } {
        const track = this.game.systems.get(TrackSystem);
        
        const totalSegments = track.segments.length;
        const safeIndex = Math.floor(segmentIndex) % totalSegments;


        const point = this._segmentPoints[safeIndex];
        const nextPoint = this._segmentPoints[(safeIndex + 1) % this._segmentPoints.length];

        const dx = nextPoint.x - point.x;
        const dz = nextPoint.z - point.z;
        const length = Math.sqrt(dx * dx + dz * dz) || 1;

        const perpX = -dz / length * 2;
        const perpZ = dx / length * 2;

        return {
            x: point.x + perpX * offset,
            z: point.z + perpZ * offset
        };
    }

    public reset() {
        
        this._trackPoints = [];
        this._segmentPoints = [];
        this.view.removeChildren();

        this._mapGraphics = new Graphics();
        this._carDots = new Graphics();
        this._playerDot = new Graphics();
        this._startMarker = new Graphics();
    }
}