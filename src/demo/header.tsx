import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MenuIcon, StarIcon } from "lucide-react";
import { toast } from "@/demo/toast";

const roll = {
    enter: (direction: number) => ({ y: `${direction * 100}%`, opacity: 0 }),
    centre: { y: "0%", opacity: 1 },
    exit: (direction: number) => ({ y: `${direction * -100}%`, opacity: 0 }),
};

/** As the webapp's header (app-header.tsx): changed digits roll up as the figure grows, down as it falls */
function RollingNumber({ value, text }: { value: number; text: string }) {
    const reduce = useReducedMotion();
    const previous = useRef(value);
    const direction = value >= previous.current ? 1 : -1;
    useEffect(() => { previous.current = value; }, [value]);

    const chars = [...text];
    return <span aria-hidden="true" className="inline-flex tabular-nums">
        {chars.map((char, i) => <span key={chars.length - i} className="relative inline-block h-[1.25em] overflow-hidden leading-[1.25em]">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <motion.span key={char} className="block" custom={direction} variants={roll} initial="enter" animate="centre" exit="exit"
                             transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}>
                    {char}
                </motion.span>
            </AnimatePresence>
        </span>)}
    </span>;
}

/** The key figure: the player's stars, linking to Statistics in the app */
export function StarCount({ stars }: { stars: number }) {
    return <a href="#progress" aria-label={`${stars} stars, view progress`}
              className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-ui-text hover:bg-ui-raised">
        <StarIcon aria-hidden="true" className="size-3.5 shrink-0 text-play-gold" fill="currentColor"/>
        <span className="flex min-w-[4.6ch] justify-start"><RollingNumber value={stars} text={stars.toLocaleString("en")}/></span>
    </a>;
}

/** The header as a visitor sees it: the menu with its notice dot, and the star count top right */
export default function Header({ stars }: { stars: number }) {
    return <div className="app-header">
        <header className="grid h-14 shrink-0 grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center px-2 text-ui-text">
            <div className="justify-self-start">
                <button type="button" aria-label="Open menu, log in to save your progress" onClick={() => toast("Opens the menu drawer")}
                        className="relative flex size-11 items-center justify-center rounded-lg hover:bg-ui-raised">
                    <MenuIcon className="size-6"/>
                    <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-full bg-ui-notice ring-2 ring-ui-bg"/>
                </button>
            </div>
            <div/>
            <div className="justify-self-end"><StarCount stars={stars}/></div>
        </header>
    </div>;
}
