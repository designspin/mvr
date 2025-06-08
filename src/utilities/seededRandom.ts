export class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    choose<T>(items: T[]): T {
        return items[this.nextInt(0, items.length - 1)];
    }

    nextRange(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }
}