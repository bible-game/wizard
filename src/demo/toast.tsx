import React, { useEffect, useState } from "react";

// Links that would leave the landing page say where they'd go instead, since the demo has no other pages
let show: ((text: string) => void) | undefined;
export const toast = (text: string) => show?.(`${text} (in the app)`);

export function Toaster() {
    const [text, setText] = useState<string>();
    useEffect(() => {
        let timer: number | undefined;
        show = (next) => { setText(next); clearTimeout(timer); timer = window.setTimeout(() => setText(undefined), 2200); };
        return () => { show = undefined; clearTimeout(timer); };
    }, []);
    return text ? <div role="status" className="fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-lg border border-ui-line bg-ui-sheet px-3.5 py-2.5 text-[14px] text-ui-text">{text}</div> : null;
}
