import { Gridmap } from "@project-gridmap/library";

/**
 * A handle on the Play page's map, from outside it: the copied page (app/play/[game]/map/gridmap.tsx) keeps its
 * gridmap to itself, so this notes each one as the library makes it (each says it's ready as it's built). The tutorial
 * uses it to pick a chapter as a tap would: selectCell raises the same event, so the page's own selection follows.
 * It also hears when the visitor zooms: the library has no event for it, but a pinch or a scroll always moves the
 * camera through setCamera, so a change of zoom there that isn't the tutorial's own glide is the visitor's
 */
const live = new Set<Gridmap>();
const zoomers = new Set<() => void>();
/** While the tutorial is moving the camera itself, its moves aren't the visitor's */
let steering = 0;
const proto = Gridmap.prototype as any;
if (!proto.__handled) {
    proto.__handled = true;
    const emit = proto.emit, destroy = proto.destroy;
    proto.emit = function (type: string, payload: unknown) { if (type === "ready") live.add(this); return emit.call(this, type, payload); };
    proto.destroy = function () { live.delete(this); return destroy.call(this); };
}
if (!proto.__zoomHandled) {
    proto.__zoomHandled = true;
    const setCamera = proto.setCamera;
    proto.setCamera = function (cx: number, cy: number, k: number) {
        const was = this.camera.k;
        const result = setCamera.call(this, cx, cy, k);
        if (!steering && Math.abs(this.camera.k - was) > was * 1e-3) zoomers.forEach(heard => heard());
        return result;
    };
}

/** Hears each zoom the visitor makes on the map (a pinch, a scroll); returns a stop */
export function onZoom(heard: () => void): () => void {
    zoomers.add(heard);
    return () => { zoomers.delete(heard); };
}

/** Moves the camera as the tutorial, not the visitor */
const steer = (map: Gridmap, cx: number, cy: number, k: number) => { steering++; try { map.setCamera(cx, cy, k); } finally { steering--; } };

/** The map on the page now (the latest made) */
export const liveMap = (): Gridmap | undefined => [...live].pop();

const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Moves the map to a division (a group), a book (an item) or back out to the whole map, smoothly, where focusGroup,
 * focusItem and focusMap jump: it takes the camera the jump would, then eases there (the zoom by its ratio, so it feels
 * even), and settles on the jump itself so the map is left as Play leaves it. `from` starts it from a camera the map has
 * already jumped away from (Play's own jump, when a round ends). Under reduced motion it simply jumps. Returns a cancel
 */
export type Camera = { cx: number; cy: number; k: number };
export const cameraOf = (map: Gridmap): Camera => { const { cx, cy, k } = (map as any).camera; return { cx, cy, k }; };

export function glideTo(map: Gridmap, to: { group: string } | { item: string } | { whole: true }, ms = 1000, start?: Camera): () => void {
    const m = map as any;
    const focus = () => "group" in to ? map.focusGroup(to.group) : "item" in to ? map.focusItem(to.item) : map.focusMap();
    const from = start ?? { ...m.camera };
    if (!focus()) return () => {};
    const end = { ...m.camera };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
    steer(map, from.cx, from.cy, from.k);
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
        const t = Math.min(1, (now - began) / ms), e = ease(t);
        if (t < 1) {
            steer(map, from.cx + (end.cx - from.cx) * e, from.cy + (end.cy - from.cy) * e, from.k * Math.pow(end.k / from.k, e));
            frame = requestAnimationFrame(tick);
        } else focus();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
}
