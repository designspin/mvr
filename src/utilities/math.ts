import { ISegmentPoint } from ".";

export function toInt(obj: string | number, def: string | number): number {
    if (obj !== null) {
        const x = parseInt(obj as string, 10);
        if (!isNaN(x)) return x;
    }
    return toInt(def, 0);
}

export function limit(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

export function percentRemaining(n: number, total: number): number {
    return (n % total) / total;
}

export function accelerate(v: number, accel: number, dt: number): number {
    return v + accel * dt;
}

export function interpolate(a: number, b: number, percent: number): number {
    return a + (b - a) * percent;
}

export function increase(start: number, increment: number, max: number): number {
    let result = start + increment;
    while (result >= max) result -= max;
    while (result < 0) result += max;
    return result;
}

export function easeIn(a: number, b: number, percent: number): number {
    return a + (b - a) * Math.pow(percent, 2);
}

export function easeOut(a: number, b: number, percent: number): number {
    return a + (b - a) * (1 - Math.pow(1 - percent, 2));
}

export function easeInOut(a: number, b: number, percent: number): number {
    return a + (b - a) * (-Math.cos(percent * Math.PI) / 2 + 0.5);
}

export function exponentialFog(distance: number, density: number): number {
    return 1 / Math.pow(Math.E, distance * distance * density);
}

export function randomInt(min: number, max: number): number {
    return Math.round(interpolate(min, max, Math.random()));
}

export function randomChoice(options: number[]): number {
    return options[randomInt(0, options.length - 1)];
}

export function project(
    p: ISegmentPoint,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    cameraDepth: number,
    width: number,
    height: number,
    roadWidth: number
): void {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width/2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height/2));
    p.screen.width = Math.round((p.screen.scale * roadWidth * width/2));
}

export function overlap(x1: number, w1: number, x2: number, w2: number, percent?: number): boolean {
    const half = (percent || 1) / 2;
    const min1 = x1 - (w1 * half);
    const max1 = x1 + (w1 * half);
    const min2 = x2 - (w2 * half);
    const max2 = x2 + (w2 * half);
    return ! ((max1 < min2) || (min1 > max2));
}

export function isOdd (number: number) {
    return Math.floor(number / 2) * 2 !== number;
}

export function mapToSmaller(number: number, maxInput: number, minOutput: number, maxOutput: number) {
    // Ensure that the input number is within the specified range
    number = Math.min(Math.max(number, 0), maxInput);
  
    // Map the input number to the output range
    const mappedValue = ((maxInput - number) / maxInput) * (maxOutput - minOutput) + minOutput;
  
    return mappedValue;
  }

  export function reverseZIndex(number:number, largestIndex:number) {
    // Ensure that the input number is within the specified range
    number = Math.min(Math.max(number, 0), largestIndex);
  
    // Map the input number to the reversed z-index range
    const reversedZIndex = largestIndex - number;
  
    return reversedZIndex;
  }