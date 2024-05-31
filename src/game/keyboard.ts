export interface Ikey {
    value: string;
    isDown: boolean;
    isUp: boolean;
    press?: () => void;
    release?: () => void;
    downHandler: (event: KeyboardEvent) => void;
    upHandler: (event: KeyboardEvent) => void;
    unsubscribe: () => void;
}

class Keyboard implements Ikey {
    value: KeyboardEvent["key"];
    isDown: boolean = false;
    isUp: boolean = true;
    press?: () => void = undefined;
    release?: () => void = undefined;
    boundDownListener: (event: KeyboardEvent) => void;
    boundUpListener: (event: KeyboardEvent) => void;

    constructor(value: KeyboardEvent["key"]) {
        this.value = value;

        this.boundDownListener = this.downHandler.bind(this);
        this.boundUpListener = this.upHandler.bind(this);

        window.addEventListener("keydown", this.boundDownListener, false);
        window.addEventListener("keyup", this.boundUpListener, false);
    }

    downHandler(event: KeyboardEvent) {
        if(event.key === this.value) {
            if(this.isUp && this.press) this.press();
            this.isDown = true;
            this.isUp = false;
        }
    }

    upHandler(event: KeyboardEvent) {
        if(event.key === this.value) {
            if(this.isDown && this.release) this.release();
            this.isDown = false;
            this.isUp = true;
        }
    }

    unsubscribe() {
        window.removeEventListener("keydown", this.boundDownListener);
        window.removeEventListener("keyup", this.boundUpListener);
    }
}

export default Keyboard;