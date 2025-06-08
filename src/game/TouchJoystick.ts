import { Sprite, Graphics, Container, Point } from "pixi.js";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

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
    originalPosition: Point = new Point(0, 0);

    constructor(opts: JoystickSettings) {
        super();

        this.settings = Object.assign({
            outerScale: { x: 1, y: 1 },
            innerScale: { x: 1, y: 1 },
        }, opts);

        if (!this.settings.outer) {
            const outer = new Graphics();
            outer.circle(0, 0, 60);
            outer.fill(0xffffff);
            outer.alpha = 0.5;
            this.settings.outer = outer;
        }

        if (!this.settings.inner) {
            const inner = new Graphics();
            inner.circle(0, 0, 30);
            inner.fill(0xffffff);
            inner.alpha = this.innerAlphaStanby;
            this.settings.inner = inner;
        }

        this.init();
        this.visible = false;
    }

    init() {
        this.outer = this.settings.outer!;
        this.inner = this.settings.inner!;

        this.outer.scale.set(this.settings.outerScale!.x, this.settings.outerScale!.y);
        this.inner.scale.set(this.settings.innerScale!.x, this.settings.innerScale!.y);

        if ('anchor' in this.outer) {
            this.outer.anchor.set(0.5)
        }

        if ('anchor' in this.inner) {
            this.inner.anchor.set(0.5);
        }

        this.addChild(this.outer);
        this.addChild(this.inner);

        this.outerRadius = this.width / 2.5;
        this.innerRadius = this.inner.width / 2;

        this.bindEvents();
        this.originalPosition = new Point(this.x, this.y);
        this.setupGlobalTouchHandler();
    }

    protected setupGlobalTouchHandler() {
        const appView = globalThis.document.querySelector('canvas');
        if (!appView) return;

        let joystickTouchId: number | null = null;
        let atMaxDistance = false;

        appView.addEventListener('touchstart', (e: TouchEvent) => {
            if (this.visible || joystickTouchId !== null) return;

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.clientX < appView.clientWidth * 0.4) {
                    joystickTouchId = touch.identifier;
                    this.x = touch.clientX;
                    this.y = touch.clientY;
                    this.visible = true;
                    this.inner.alpha = 1;

                    try {
                        Haptics.impact({ style: ImpactStyle.Light });
                    } catch {
                        if (navigator.vibrate) {
                            navigator.vibrate(15);
                        }
                    }

                    this.settings.onStart?.();
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        appView.addEventListener('touchmove', (e: TouchEvent) => {
            if (joystickTouchId === null || !this.visible) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId) {
                    const deltaX = touch.clientX - this.x;
                    const deltaY = touch.clientY - this.y;

                    if (deltaX === 0 && deltaY === 0) return;

                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    const radian = Math.atan2(deltaY, deltaX);
                    const angle = (radian * 180 / Math.PI + 360) % 360;

                    let centerX, centerY;
                    const hitMaxDistance = distance > this.outerRadius;

                    if (hitMaxDistance) {
                        centerX = this.outerRadius * Math.cos(radian);
                        centerY = this.outerRadius * Math.sin(radian);
                        if (!atMaxDistance) {
                            try {
                                Haptics.impact({ style: ImpactStyle.Medium });
                            } catch {
                                if (navigator.vibrate) {
                                    navigator.vibrate(30);
                                }
                            }
                            atMaxDistance = true;
                        }
                    } else {
                        centerX = deltaX;
                        centerY = deltaY;
                        atMaxDistance = false; // Reset when no longer at max
                    }

                    this.inner.position.set(centerX, centerY);

                    const centerPoint = new Point(centerX, centerY);
                    const power = this.getPower(centerPoint);
                    const direction = this.getDirection(centerPoint);

                    this.settings.onChange?.({ angle, direction, power });
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        appView.addEventListener('touchend', (e: TouchEvent) => {
            if (joystickTouchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId) {
                    joystickTouchId = null;
                    this.visible = false;
                    this.inner.position.set(0, 0);
                    this.inner.alpha = this.innerAlphaStanby;
                    this.x = this.originalPosition.x;
                    this.y = this.originalPosition.y;

                    this.settings.onChange?.({
                        angle: 0,
                        direction: Direction.TOP,
                        power: 0
                    });
                    this.settings.onEnd?.();
                    break;
                }
            }
        }, { passive: false });
    }

    protected bindEvents() {
        this.eventMode = 'static';
    }

    protected getPower(point: Point) {
        let a = point.x - 0;
        let b = point.y - 0;
        return Math.min(1, Math.sqrt(a * a + b * b) / this.outerRadius);
    }

    protected getDirection(center: Point) {
        let rad = Math.atan2(center.y, center.x);
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