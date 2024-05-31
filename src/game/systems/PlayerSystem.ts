import { Container, Sprite } from "pixi.js";
import { System } from "../SystemRunner";
import { Game, designConfig } from "..";
import { JoystickChangeEvent } from "../TouchJoystick";
import { ControlButtonChangeEvent } from "../ControlButton";
import { HudSystem } from "./HudSystem";
import { TrackSystem } from "./TrackSystem";
import { accelerate, increase, interpolate, limit, mapToSmaller, overlap, percentRemaining, randomChoice } from "../../utilities";
import { ObjectSystem } from "./ObjectSystem/ObjectsSystem";
import Keyboard from '../keyboard';
import { sound } from "@pixi/sound";

const imageNo = "01";

export class PlayerSystem implements System
{
    public static SYSTEM_ID = 'player';
    public game!: Game;

    public view = new Container();

    private _player = new Container();
    private _sprite: Sprite = new Sprite();
    private _shadow: Sprite = new Sprite();
    private _racing: boolean = false;

    public X = 0.7;
    public Y = 0;

    private _speed = 0;
    private _movementData: JoystickChangeEvent | null = null;
    private _accelData: ControlButtonChangeEvent | null = null;
    private _brakeData: ControlButtonChangeEvent | null = null;
    private _keyUp: Keyboard = new Keyboard("ArrowUp");
    private _keyDown: Keyboard = new Keyboard("ArrowDown");
    private _keyLeft: Keyboard = new Keyboard("ArrowLeft");
    private _keyRight: Keyboard = new Keyboard("ArrowRight");

    get Z()
    {
        return this.game.camera.height / this.game.camera.depth;
    }

    get maxSpeed()
    {
        const track = this.game.systems.get(TrackSystem);
        return (2 * track.segmentLength) / (1 / 60);
    }

    get accel()
    {
        return this.maxSpeed / 5;
    }

    get breaking()
    {
        return -this.maxSpeed;
    }

    get decel()
    {
        return -this.maxSpeed / 5;
    }

    get offRoadDecel()
    {
        return -this.maxSpeed / 2;
    }

    get offRoadLimit()
    {
        return this.maxSpeed / 4;
    }

    get speed()
    {
        return this._speed;
    }

    get segment()
    {
        const track = this.game.systems.get(TrackSystem);
        return track.findSegment(this.game.camera.position + this.Z);
    }

    get scale()
    {
        return 0.5 * (1 / this._sprite.texture?.width);
    }

    get width()
    {
        return this._sprite.texture?.width * this.scale;
    }

    get height()
    {
        return this._sprite.texture?.height * this.scale;
    }

    public init()   
    {
        this._sprite.anchor.set(0.5);
        this._shadow.anchor.set(0.5);
        this._shadow.alpha = 0.3;
        this._shadow.tint = 0x000000;

        if(this.game.sheet && this.game.sheet.textures && this.game.sheet.textures[`car-${imageNo}-straight`]) {
            this._sprite.texture = this.game.sheet.textures[`car-${imageNo}-straight`];
            this._shadow.texture = this._sprite.texture;
        } else {
            throw new Error("Unable to assign texture for player.");
        }
        const hud = this.game.systems.get(HudSystem);
        const objectSystem = this.game.systems.get(ObjectSystem);
        
        objectSystem.signals.onLightsReady.connect(() => {
            this._racing = true;
            if(this.game.isMobileDevice) {
                hud.signals.onTouchJoystickMove.connect((data) => {
                    this._movementData = data;
                });

                hud.signals.onAccelChange.connect((data) => {
                    this._accelData = data;
                });

                hud.signals.onBrakeChange.connect((data) => {
                    this._brakeData = data;
                });
        
                hud.signals.onTouchJoystickEnd.connect(() => {
                    this._movementData = null;
                });
            }
        });
        
        this.view.addChild(this._player);
        this._player.addChild(this._shadow);
        this._player.addChild(this._sprite);
        
        this.game.stage.addChild(this.view);

        sound.play('audio/engine-loop.wav', { 
            loop: true, 
            speed: 0.8,
            volume: 0.2
        });
    }

    public update(dt: number)
    {
        const track = this.game.systems.get(TrackSystem);

        sound.find('audio/engine-loop.wav').speed = mapToSmaller(this._speed, this.maxSpeed, 3.2, 0.8);
        
        dt = dt / 100;
        this.game.camera.position = increase(this.game.camera.position, dt * this.speed, track.trackLength);
        const playerSegment = this.segment;
        const playerPercent = percentRemaining(this.game.camera.position + this.Z, track.segmentLength);
        const speedPercent = this.speed / this.maxSpeed;
        const dx = dt * 2 * speedPercent;

        
            if(this._movementData?.direction === "left" ||  
                this._movementData?.direction === "top-left" || 
                this._movementData?.direction === "bottom-left" ||
                this._racing && this._keyLeft.isDown) {
                this.X = this.X - dx;
            } else if(this._movementData?.direction === "right" || 
                this._movementData?.direction === "top-right" || 
                this._movementData?.direction === "bottom-right" ||
                this._racing && this._keyRight.isDown) {
                this.X = this.X + dx;
            }

            this.X = this.X - (dx * speedPercent * playerSegment.curve * 0.5);

            if(this._accelData?.state === "pressed" || this._keyUp.isDown && this._racing) {
                this._speed = accelerate(this._speed, this.accel, dt);
            } else if(this._brakeData?.state === "pressed" || this._keyDown.isDown && this._racing) {
                this._speed = accelerate(this._speed, this.breaking, dt);
            } else {
                this._speed = accelerate(this._speed, this.decel, dt);
            }

        if (this.X < -1 || this.X > 1) {
            if (this._speed > this.offRoadLimit) this._speed = accelerate(this._speed, this.offRoadDecel, dt);
            
            if(playerSegment.sprites !== undefined && playerSegment.sprites.length > 0)
            for(let n = 0; n < playerSegment.sprites.length; n++) {
                const sprite = playerSegment.sprites[n];
                const spriteW = sprite.texture.width * sprite.ObjectScale;
                if(overlap(this.X, this.width, sprite.offset + spriteW/2 * (sprite.offset > 0 ? 1 : -1), spriteW, 0.8)) {
                    this._speed = this.maxSpeed / 5;
                    this.game.camera.position = increase(playerSegment.p1.world.z, -this.Z, track.trackLength);
                }
            }
        }

        if(playerSegment.cars !== undefined && playerSegment.cars.length > 0) {
            for(let n = 0; n < playerSegment.cars.length; n++) {
                const car = playerSegment.cars[n];
                const carW = car.texture?.width * car.displayScale;
                if(this._speed > car.speed) {
                    if(overlap(this.X, this.width, car.offset, carW, 0.8)) {
                        this._speed = car.speed * (car.speed / this._speed);
                        this.game.camera.position = increase(car.z, -this.Z, track.trackLength);
                    }
                }
            }
        }

        this.X = limit(this.X, -3, 3);
        this._speed = limit(this._speed, 0, this.maxSpeed);

        const bounce = (25 * Math.random()) * speedPercent * randomChoice([-1, 1]);

        const destW =
            this.width *
            (this.game.camera.depth / this.Z) *
            (designConfig.content.width / 2) *
            this.scale * track.roadWidth;
        
        const destH =
            this.height *
            (this.game.camera.depth / this.Z) *
            (designConfig.content.width / 2) *
            this.scale * track.roadWidth;
        
        const destX = designConfig.content.width / 2;

        const destY =
            designConfig.content.height / 2 -
            ((this.game.camera.depth / this.Z) *
                interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) *
                designConfig.content.height) /
            2;
        
        this._sprite.x = destX + (destW * -0.5);
        this._sprite.y = destY + destH * bounce;
        this._shadow.x = destX + (destW * -0.5);
        this._shadow.y = (destY + destH * bounce) + 10;

        this._sprite.scale.set(destW / this.width);
        this._shadow.scale.set(destW / this.width);

        const steer = this._movementData?.direction || this._keyLeft.isDown && this._speed > 0 && "left" || this._keyRight.isDown && this.speed > 0 &&  "right";
        const power = this._movementData?.power;
        const upDown = playerSegment.p2.world.y - playerSegment.p1.world.y;

        if(this.game.sheet?.textures) {
            if(steer === "left" || steer === "top-left" || steer === "bottom-left") {
                if(upDown > 0) {
                    this._sprite.texture = (power && power > 0.7) ? this.game.sheet.textures[`car-${imageNo}-uphill-left-hard`] : this.game.sheet.textures[`car-${imageNo}-uphill-left`];
                } else {
                    this._sprite.texture = (power && power > 0.7) ? this.game.sheet.textures[`car-${imageNo}-left-hard`] : this.game.sheet.textures[`car-${imageNo}-left`];
                }
            } else if(steer === "right" || steer === "top-right" || steer === "bottom-right") {
                if(upDown > 0) {
                    this._sprite.texture = (power && power > 0.7) ? this.game.sheet.textures[`car-${imageNo}-uphill-right-hard`] : this.game.sheet.textures[`car-${imageNo}-uphill-right`];
                } else {
                    this._sprite.texture = (power && power > 0.7) ? this.game.sheet.textures[`car-${imageNo}-right-hard`] : this.game.sheet.textures[`car-${imageNo}-right`];
                }
            } else {
                if(upDown > 0) {
                    this._sprite.texture = this.game.sheet.textures[`car-${imageNo}-uphill`];
                } else {
                    this._sprite.texture = this.game.sheet.textures[`car-${imageNo}-straight`];
                }
            }

            this._shadow.texture = this._sprite.texture;
        }
    }
}