import { Sprite, Graphics, Container, Point, FederatedEvent } from "pixi.js";

export interface JoystickChangeEvent {
    angle: number;
    direction: Direction;
    power: number;
}

export enum Direction {
    LEFT = 'left',
    TOP = 'top',
    BOTTOM = 'bottom',
    RIGHT = 'right',
    TOP_LEFT = 'top-left',
    TOP_RIGHT = 'top-right',
    BOTTOM_LEFT = 'bottom-left',
    BOTTOM_RIGHT = 'bottom-right',
}

export interface JoystickSettings {
    outer?: Sprite | Graphics | Container;
    inner?: Sprite | Graphics | Container;
    outerScale?: { x: number, y: number };
    innerScale?: { x: number, y: number };
    onChange?: (event: JoystickChangeEvent) => void;
    onStart?: () => void;
    onEnd?: () => void;
}

export class TouchJoystick extends Container {
    settings: JoystickSettings;

    outerRadius: number = 0;
    innerRadius: number = 0;

    outer!: Sprite | Graphics | Container;
    inner!: Sprite | Graphics | Container;

    innerAlphaStanby: number = 0.5;

    constructor(opts: JoystickSettings) {
        super();

        this.settings = Object.assign({
            outerScale: { x: 1, y: 1 },
            innerScale: { x: 1, y: 1 },
        }, opts);

        if(!this.settings.outer) {
            const outer = new Graphics();
            
            outer.circle(0, 0, 60);
            outer.fill(0xffffff);
            outer.alpha = 0.5;
            this.settings.outer = outer;
        }

        if(!this.settings.inner) {
            const inner = new Graphics();
            inner.circle(0, 0, 30);
            inner.fill(0xffffff);
            inner.alpha = this.innerAlphaStanby;
            this.settings.inner = inner;
        }

        this.init();
    }

    init() {
        this.outer = this.settings.outer!;
        this.inner = this.settings.inner!;

        this.outer.scale.set(this.settings.outerScale!.x, this.settings.outerScale!.y);
        this.inner.scale.set(this.settings.innerScale!.x, this.settings.innerScale!.y);

        if('anchor' in this.outer) {
            this.outer.anchor.set(0.5)
        }

        if('anchor' in this.inner) {
            this.inner.anchor.set(0.5);
        }

        this.addChild(this.outer);
        this.addChild(this.inner);

        this.outerRadius = this.width / 2.5;
        this.innerRadius = this.inner.width / 2;

        this.bindEvents();
    }

    protected bindEvents() {
        let that = this;
        this.interactive = true;
        
        let dragging = false;
        let power: number;
        let startPosition: Point;

        function onDragStart(e: FederatedEvent) {
            startPosition = that.toLocal(e.page);
            dragging = true;
            that.inner.alpha = 1;
            that.settings.onStart?.();
        };

        function onDragEnd(_e: FederatedEvent) {
            if(!dragging) return;
            that.inner.position.set(0, 0);
            dragging = false;
            that.inner.alpha = that.innerAlphaStanby;
            that.settings.onEnd?.();
        };

        function onDragMove(e: FederatedEvent) {
            if(!dragging) return;
            let newPosition = that.toLocal(e.page);
            let sideX = newPosition.x - startPosition.x;
            let sideY = newPosition.y - startPosition.y;
            let centerPoint = new Point(0, 0);
            let angle = 0;
            if(sideX === 0 && sideY === 0) { return; }
            // let calRadius = 0;
            // if(sideX * sideX + sideY * sideY >= that.outerRadius * that.outerRadius) {
            //     calRadius = that.outerRadius;
            // } 
            // else 
            // {
            //     calRadius = that.outerRadius - that.innerRadius;
            // }
            let direction = Direction.LEFT;

            if(sideX === 0) {
                if(sideY > 0) {
                    centerPoint.set(0, (sideY > that.outerRadius ? that.outerRadius : sideY));
                    angle = 270;
                    direction = Direction.BOTTOM;
                } else {
                    centerPoint.set(0, -(Math.abs(sideY) > that.outerRadius ? that.outerRadius : Math.abs(sideY)));
                    angle = 90;
                    direction = Direction.TOP;
                }
                that.inner.position.set(centerPoint.x, centerPoint.y);
                power = that.getPower(centerPoint);
                that.settings.onChange?.({ angle, direction, power, });
                return;
            }

            if (sideY == 0) {
                if (sideX > 0) {
                  centerPoint.set((Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX)), 0);
                  angle = 0;
                  direction = Direction.LEFT;
                } else {
                  centerPoint.set(-(Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX)), 0);
                  angle = 180;
                  direction = Direction.RIGHT;
                }
        
                that.inner.position.set(centerPoint.x, centerPoint.y);
                power = that.getPower(centerPoint);
                that.settings.onChange?.({ angle, direction, power, });
                return;
            }

            let tanVal = Math.abs(sideY / sideX);
            let radian = Math.atan(tanVal);
            angle = radian * 180 / Math.PI;

            let centerX = 0;
            let centerY = 0;

            if (sideX * sideX + sideY * sideY >= that.outerRadius * that.outerRadius) {
                centerX = that.outerRadius * Math.cos(radian);
                centerY = that.outerRadius * Math.sin(radian);
            }
            else {
                centerX = Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX);
                centerY = Math.abs(sideY) > that.outerRadius ? that.outerRadius : Math.abs(sideY);
            }

            if (sideY < 0) {
                centerY = -Math.abs(centerY);
            }
            if (sideX < 0) {
                centerX = -Math.abs(centerX);
            }

            if (sideX > 0 && sideY < 0) {
                // < 90
            }
            else if (sideX < 0 && sideY < 0) {
                // 90 ~ 180
                angle = 180 - angle;
            }
            else if (sideX < 0 && sideY > 0) {
                // 180 ~ 270
                angle = angle + 180;
            }
            else if (sideX > 0 && sideY > 0) {
                // 270 ~ 369
                angle = 360 - angle;
            }
            centerPoint.set(centerX, centerY);
            power = that.getPower(centerPoint);

            direction = that.getDirection(centerPoint);
            that.inner.position.set(centerPoint.x, centerPoint.y);

            that.settings.onChange?.({ angle, direction, power, });
        }

        this.on('pointerdown', onDragStart)
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', onDragMove);
    }

    protected getPower(point: Point) {
        let a = point.x - 0;
        let b = point.y - 0;
        return Math.min(1, Math.sqrt(a * a + b * b) / this.outerRadius);
    }

    protected getDirection(center: Point) {
        let rad = Math.atan2(center.y, center.x);// [-PI, PI]
        if ((rad >= -Math.PI / 8 && rad < 0) || (rad >= 0 && rad < Math.PI / 8)) {
          return Direction.RIGHT;
        } else if (rad >= Math.PI / 8 && rad < 3 * Math.PI / 8) {
          return Direction.BOTTOM_RIGHT;
        } else if (rad >= 3 * Math.PI / 8 && rad < 5 * Math.PI / 8) {
          return Direction.BOTTOM;
        } else if (rad >= 5 * Math.PI / 8 && rad < 7 * Math.PI / 8) {
          return Direction.BOTTOM_LEFT;
        } else if ((rad >= 7 * Math.PI / 8 && rad < Math.PI) || (rad >= -Math.PI && rad < -7 * Math.PI / 8)) {
          return Direction.LEFT;
        } else if (rad >= -7 * Math.PI / 8 && rad < -5 * Math.PI / 8) {
          return Direction.TOP_LEFT;
        } else if (rad >= -5 * Math.PI / 8 && rad < -3 * Math.PI / 8) {
          return Direction.TOP;
        } else {
          return Direction.TOP_RIGHT;
        }
    }
}