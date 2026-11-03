import React from "react";
import { BookOpenIcon, CalendarIcon, FlameIcon, StarIcon } from "lucide-react";
import { evenly, useStepTips, type StepTip } from "@/demo/tour";
import type { MotionValue } from "framer-motion";

const TIPS: StepTip[] = [
    { id: "streak", target: "streak", title: "Day streak", text: "Play on consecutive days to keep it going. Miss a day and it starts again." },
    { id: "seen", target: "coverage", above: true, title: "Bible seen", text: "Each chapter you read lights up, book by book, until you’ve seen the whole Bible." },
];

// the Minor Prophets, as Statistics shows coverage: a row of cells per book, one per chapter
const PROPHETS: [string, number][] = [["Hosea", 14], ["Joel", 3], ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7]];

/**
 * Stats, shown: Statistics as the app has it, with the visitor's figures so far and the chapter they read lit in its
 * division's coverage, while tooltips explain the streak and Bible seen
 */
export default function StatsStep({ progress, active, stars, streak, seen, games, read }: { progress: MotionValue<number>; active: boolean; stars: number; streak: number; seen: string; games: number; read: boolean }) {
    const figures = [
        { key: "stars", label: "Stars", value: stars, icon: StarIcon, colour: "text-ui-accent", fill: true },
        { key: "streak", label: "Day streak", value: streak, icon: FlameIcon, colour: "text-ui-orange" },
        { key: "seen", label: "Bible seen", value: seen, icon: BookOpenIcon, colour: "text-ui-text" },
        { key: "games", label: "Games", value: games, icon: CalendarIcon, colour: "text-ui-text" },
    ];
    const { root, tip, layer } = useStepTips(progress, active, evenly(TIPS));
    return <div ref={root} className="relative flex h-full flex-col">{<>
        <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-5 border-b border-ui-line px-6 pb-5 pt-4 max-[440px]:px-4">
            {figures.map(({ key, label, value, icon: Icon, colour, fill }) => <div key={key} ref={tip(key)} className="min-w-0 justify-self-start">
                <dt className="flex items-center gap-2 text-[15px] text-ui-muted"><Icon className={`size-[18px] ${colour}`} fill={fill ? "currentColor" : "none"}/>{label}</dt>
                <dd className="mt-1 text-[32px] font-semibold leading-[38px] tabular-nums">{value}</dd>
            </div>)}
        </dl>

        {/* coverage, as on Statistics: the division's key edge, then a cell per chapter, lit once read */}
        <div ref={tip("coverage")} className="grid min-h-0 flex-1 content-start gap-3 px-6 pt-5 max-[440px]:px-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><span className="h-4 w-1 rounded-full bg-play-gold"/>Minor Prophets</p>
            {PROPHETS.map(([book, chapters]) => <div key={book} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[13px] text-ui-muted">{book}</span>
                <div className="flex flex-1 flex-wrap gap-[3px]">{[...Array(chapters)].map((_, i) => {
                    const lit = book === "Jonah" && i === 0 && read;
                    return <span key={i} className={`size-3.5 rounded-[3px] border ${lit ? "border-play-gold bg-play-gold shadow-[0_0_6px_rgba(212,180,85,0.5)]" : "border-play-gold/35"}`}/>;
                })}</div>
            </div>)}
            {/* where Stats' content ends: the sign-up below pulls up into the space under it */}
            <span data-stats-end aria-hidden="true"/>
        </div>
        {layer}
    </>}</div>;
}

/** The step's share of the tour's scroll, as a share of the screen's height */
export const STATS_LENGTH = 70;
