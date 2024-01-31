class Camera {
    private fieldOfView = 98;
    private _height = 1000;
    private _drawDistance = 300;
    private _fogDensity = 5;
    private _position = 30;

    get height() {
        return this._height;
    }

    get depth() {
        return 1 / Math.tan((this.fieldOfView / 2) * Math.PI / 180);
    }

    get drawDistance() {
        return this._drawDistance;
    }

    get fogDensity() {
        return this._fogDensity;
    }

    get position() {
        return this._position;
    }

    set position(value) {
        this._position = value;
    }
}

export default Camera;