export const EasingFunctions = {
    // no easing, no acceleration
    linear: (t: number) => t,
    // accelerating from zero velocity
    easeInQuad: (t: number) => t*t,
    // decelerating to zero velocity
    easeOutQuad: (t: number) => t*(2-t),
    // acceleration until halfway, then deceleration
    easeInOutQuad: (t: number) => t<.5 ? 2*t*t : -1+(4-2*t)*t,
    // accelerating from zero velocity 
    easeInCubic: (t: number) => t*t*t,
    // decelerating to zero velocity 
    easeOutCubic: (t: number) => (--t)*t*t+1,
    // acceleration until halfway, then deceleration 
    easeInOutCubic: (t: number) => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,
    // accelerating from zero velocity 
    easeInQuart: (t: number) => t*t*t*t,
    // decelerating to zero velocity 
    easeOutQuart: (t: number) => 1-(--t)*t*t*t,
    // acceleration until halfway, then deceleration
    easeInOutQuart: (t: number) => t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t,
    // accelerating from zero velocity
    easeInQuint: (t: number) => t*t*t*t*t,
    // decelerating to zero velocity
    easeOutQuint: (t: number) => 1+(--t)*t*t*t*t,
    // acceleration until halfway, then deceleration 
    easeInOutQuint: (t: number) => t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t,
    easeInElastic: (x: number) => {
        const c4 = (2 * Math.PI) / 3;

        return x === 0
        ? 0
        : x === 1
        ? 1
        : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
    },
    easeOutElastic: (x: number) => {
        const c4 = (2 * Math.PI) / 3;

        return x === 0
        ? 0
        : x === 1
        ? 1
        : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    },
    easeInOutElastic: (x: number) => {
        const c5 = (2 * Math.PI) / 4.5;

        return x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5
        ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
    }
}

export function animate(
    draw: (t: number) => void,
    duration: number = 1000,
    timing: (t: number) => number = EasingFunctions.easeOutElastic,
) {
    const start = performance.now();

    return new Promise<boolean>(function(resolve){
        requestAnimationFrame(function animate(time) { 
            let timeFraction = (time -start) / duration;
            (timeFraction > 1) && (timeFraction = 1);
            draw(timing(timeFraction));
            timeFraction < 1 ? requestAnimationFrame(animate) : resolve(true);
        });
    })
}