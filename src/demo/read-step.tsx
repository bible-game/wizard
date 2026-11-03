import React from "react";
import type { MotionValue } from "framer-motion";
import { CheckCircle2Icon, ChevronDownIcon, CircleIcon } from "lucide-react";
import { CHAPTER, PRACTICE, READ_MINUTES } from "@/demo/practice";
import { useStepTips, type StepTip } from "@/demo/tour";
import { glow, tone } from "@/core/style/regions";
import { playTheme } from "@/core/style/play-theme";
import Why from "@/demo/why";

// no tooltip unless it's needed: only when the visitor tries to scroll on before marking it read
const TIP: StepTip = { id: "mark", target: "mark", above: true, title: "Read it?", text: "Tap Mark as read to carry on." };

// the Psalms are a Wisdom book, so Read wears the red region's colour
export const tint = playTheme.rose;

/** The step's share of the tour's scroll, as a share of the screen's height: the psalm fits on one screen */
export const READ_LENGTH = 90;

/**
 * 02 Read: the reader as the app has it, with the psalm the visitor just found, set as poetry. It's short enough to
 * read on the one screen; marking it read is the visitor's to do, and what lets them carry on
 */
export default function ReadStep({ progress, active, nudge, read, onRead }: { progress: MotionValue<number>; active: boolean; nudge: number; read: boolean; onRead: () => void }) {
    const { root, tip, layer } = useStepTips(progress, active, () => read || !nudge ? null : TIP, [read, nudge], nudge);
    const name = `Psalm ${PRACTICE.chapter}`;
    return <div ref={root} className="relative flex h-full flex-col">
        <Why>Read what you found, then mark it read: it takes under a minute.</Why>
        {/* the reader's title row: the passage, and how long it takes */}
        <div className="relative flex h-12 shrink-0 items-center justify-center gap-1 border-b border-ui-line text-[17px] font-semibold">
            {name}<ChevronDownIcon className="size-4 text-ui-muted"/>
            <span className="absolute right-4 text-[13px] font-semibold tabular-nums text-ui-muted">{READ_MINUTES} min</span>
        </div>

        {/* the psalm, a verse at a time, each line of it on its own */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-4 text-[17px] leading-[27px] max-[440px]:px-4">
            {CHAPTER.map((lines, v) => <p key={v} className="mb-3">
                {v === 0 ? <span aria-hidden="true" className="float-left mr-2 mt-[4px] text-[54px] font-medium leading-[48px]" style={{ color: tint }}>{lines[0][0]}</span> :
                    <sup className="mr-1 font-mono text-[10px] text-ui-faint">{v + 1}</sup>}
                {lines.map((line, l) => <React.Fragment key={l}>
                    {v === 0 && l === 0 ? <><span className="sr-only">{line[0]}</span>{line.slice(1)}</> : line}
                    {l < lines.length - 1 ? <br/> : null}
                </React.Fragment>)}
            </p>)}
        </div>

        {/* as Read's own button: in the book's colour until it's done */}
        <div className="shrink-0 px-6 pb-4 pt-2 max-[440px]:px-4">
            <button ref={tip("mark")} type="button" onClick={onRead} disabled={read} aria-pressed={read}
                    style={read ? { borderColor: `${tint}99`, background: `${tint}1f`, color: tint } : { background: tone(tint, "solid"), boxShadow: glow(tint), color: playTheme.bg, borderColor: "transparent" }}
                    className="ui-button h-12 w-full !text-[16px] [&_svg]:size-5">
                {read ? <><CheckCircle2Icon/>Read</> : <><CircleIcon/>Mark as read</>}
            </button>
        </div>
        {layer}
    </div>;
}
