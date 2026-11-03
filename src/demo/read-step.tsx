import React, { useEffect, useRef } from "react";
import { motion, MotionValue, useReducedMotion, useTransform } from "framer-motion";
import { CheckCircle2Icon, ChevronDownIcon, CircleIcon } from "lucide-react";
import { BIBLE_YEARS, CHAPTER, PRACTICE, READ_MINUTES } from "@/demo/practice";
import { evenly, useStepTips, type StepTip } from "@/demo/tour";
import { glow, tone } from "@/core/style/regions";
import { playTheme } from "@/core/style/play-theme";

// the verse numbers first, while the text is still at its start; then the time, as it moves; Mark as read at its end
const TIPS: StepTip[] = [
    { id: "verse", target: "verse", title: "Verse numbers", text: "The small numbers mark each verse, so you can find a line again, or come back to it." },
    { id: "time", target: "time", title: `About ${READ_MINUTES} minutes`, text: `Read shows how long a chapter takes. Read one a day and you’ll get through the whole Bible in ${BIBLE_YEARS}.` },
    { id: "mark", target: "mark", above: true, title: "Mark as read", text: "Tap it once you’ve read the chapter. Every chapter you read counts towards how much of the Bible you’ve seen." },
];

/** Where the scroll moves the text: it holds while the first tip shows, then runs to the chapter's end before the last one */
const MOVE = [0.2, 0.86];
/** The verse numbers while the text holds, the time while it runs, Mark as read once it's done */
const readTip = (p: number) => TIPS[p < MOVE[0] ? 0 : p < MOVE[1] + 0.02 ? 1 : 2];

// Jonah is a Minor Prophet, so Read wears the gold region's colour
export const tint = playTheme.gold;

/** The chapter, moved by the stage's scroll: as far as its text runs past the window it's read in */
function Passage({ progress, verse }: { progress: MotionValue<number>; verse: (el: Element | null) => void }) {
    const reduce = useReducedMotion();
    const window_ = useRef<HTMLDivElement>(null), text = useRef<HTMLDivElement>(null);
    // how far the text runs past its window, kept in a ref so the scroll's transform always reads the latest
    const travel = useRef(0);
    useEffect(() => {
        const measure = () => { travel.current = Math.max(0, (text.current?.offsetHeight ?? 0) - (window_.current?.clientHeight ?? 0)); };
        measure();
        const observer = new ResizeObserver(measure);
        if (window_.current) observer.observe(window_.current);
        if (text.current) observer.observe(text.current);
        return () => observer.disconnect();
    }, []);
    const y = useTransform(progress, p => -travel.current * Math.min(1, Math.max(0, (p - MOVE[0]) / (MOVE[1] - MOVE[0]))));

    const [first, ...rest] = CHAPTER;
    return <div ref={window_} className={`relative min-h-0 flex-1 ${reduce ? "overflow-y-auto" : "overflow-hidden"}`}>
        <motion.div ref={text} style={reduce ? undefined : { y }} className="px-6 pb-44 pt-5 text-[18px] leading-[30px] max-[440px]:px-4">
            <p>
                <span aria-hidden="true" className="float-left mr-2 mt-[5px] text-[58px] font-medium leading-[52px]" style={{ color: tint }}>{first[0]}</span>
                <span className="sr-only">{first[0]}</span>{first.slice(1)}{" "}
                {rest.map((line, i) => <span key={i}>
                    <sup ref={i === 0 ? verse : undefined} className="mr-1 font-mono text-[10px] text-ui-faint">{i + 2}</sup>{line}{" "}
                </span>)}
            </p>
        </motion.div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-ui-bg to-transparent"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-ui-bg"/>
    </div>;
}

/**
 * 02 Read, shown: the reader as the app has it, the whole chapter moving through it as the page scrolls, while tooltips
 * explain the verse numbers, the reading time and Mark as read. Marking it read is the visitor's to do
 */
export default function ReadStep({ progress, active, read, onRead }: { progress: MotionValue<number>; active: boolean; read: boolean; onRead: () => void }) {
    const { root, tip, layer } = useStepTips(progress, active, readTip);
    return <div ref={root} className="relative flex h-full flex-col">{<>
        {/* the reader's title row: the passage, and how long it takes */}
        <div className="relative flex h-12 shrink-0 items-center justify-center gap-1 border-b border-ui-line text-[17px] font-semibold">
            {PRACTICE.book} {PRACTICE.chapter}<ChevronDownIcon className="size-4 text-ui-muted"/>
            <span ref={tip("time")} className="absolute right-4 text-[13px] font-semibold tabular-nums text-ui-muted">{READ_MINUTES} min</span>
        </div>

        <Passage progress={progress} verse={tip("verse")}/>

        {/* as Read's own button: in the book's colour until it's done */}
        <div className="shrink-0 px-6 pb-4 pt-2 max-[440px]:px-4">
            <button ref={tip("mark")} type="button" onClick={onRead} disabled={read} aria-pressed={read}
                    style={read ? { borderColor: `${tint}99`, background: `${tint}1f`, color: tint } : { background: tone(tint, "solid"), boxShadow: glow(tint), color: playTheme.bg, borderColor: "transparent" }}
                    className="ui-button h-12 w-full !text-[16px] [&_svg]:size-5">
                {read ? <><CheckCircle2Icon/>Read</> : <><CircleIcon/>Mark as read</>}
            </button>
        </div>
        {layer}
    </>}</div>;
}

/** The step's share of the tour's scroll, as a share of the screen's height */
export const READ_LENGTH = 200;
