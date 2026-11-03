const STAR_PATH = "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

/**
 * A star flies from one element up into another (the key figure), arcing over on the way, then `land` runs. It lands
 * once: when the flight ends, or on a timer, since a page in the background doesn't run animations
 */
export function flyStar(from: Element | null | undefined, to: Element | null | undefined, land: () => void) {
    let down = false;
    const once = () => { if (!down) { down = true; land(); } };
    const a = from?.getBoundingClientRect(), b = to?.getBoundingClientRect();
    if (!a || !b || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { once(); return; }

    const star = document.createElement("div");
    star.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#d4b455"><path d="${STAR_PATH}"/></svg>`;
    Object.assign(star.style, { position: "fixed", zIndex: "60", left: `${a.left + a.width / 2 - 9}px`, top: `${a.top + a.height / 2 - 9}px`, pointerEvents: "none", filter: "drop-shadow(0 0 6px rgba(212,180,85,.6))" });
    document.body.appendChild(star);
    const dx = b.left + 16 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const finish = () => { star.remove(); once(); };
    star.animate([
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.2 - 60}px) scale(1.3)`, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 0.9 },
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = finish;
    window.setTimeout(finish, 1000);
}
