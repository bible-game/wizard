import React, { useState } from "react";
import type { MotionValue } from "framer-motion";
import { CheckIcon, StarIcon, XIcon } from "lucide-react";
import { QUESTION } from "@/demo/practice";
import { useStepTips, type StepTip } from "@/demo/tour";

// no tooltip unless it's needed: only when the visitor tries to scroll on without answering
const TIP: StepTip = { id: "answer", target: "answers", title: "One answer to go", text: "Choose the one you think fits best to carry on." };

/** The step's share of the tour's scroll, as a share of the screen's height */
export const STUDY_LENGTH = 70;

/**
 * 03 Study, cut to one question about what the psalm means: the visitor's first answer stands, with the verses that
 * explain it.
 * A right answer earns a star, which flies up from the option; any answer lets them carry on
 */
export default function StudyStep({ progress, active, nudge = 0, onStar, onDone, explain, next }: {
    progress: MotionValue<number>; active: boolean; nudge?: number; onStar?: (from: Element) => void; onDone?: () => void;
    /** a tip that says what this step is, shown until it's answered */
    explain?: StepTip;
    /** once it's answered, what comes next */
    next?: React.ReactNode;
}) {
    const [answer, setAnswer] = useState<string>();
    const { root, tip, layer } = useStepTips(progress, active, () => answer ? null : nudge ? TIP : explain ?? null, [answer, nudge], nudge);

    function choose(option: string, from: Element) {
        if (answer) return;
        setAnswer(option);
        if (option === QUESTION.correct) onStar?.(from);
        onDone?.();
    }

    const right = answer === QUESTION.correct;
    return <div ref={root} className="relative flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pt-6 max-[440px]:px-4">
            <p id="question" className="text-balance font-condensed text-[21px] font-medium leading-[27px]">{QUESTION.content}</p>
            <div ref={tip("answers")} role="group" aria-labelledby="question" className="grid gap-2.5">
                {QUESTION.options.map(option => {
                    const chosen = answer === option, correct = option === QUESTION.correct;
                    const shown = answer && (chosen || correct);
                    return <button key={option} type="button" onClick={e => choose(option, e.currentTarget)} disabled={!!answer}
                                   className={`flex min-h-[52px] items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-[16px] leading-[22px] transition enabled:hover:bg-ui-raised ${shown
                                       ? correct ? "border-ui-success/60 bg-ui-success/10" : "border-ui-error/60 bg-ui-error/10" : "border-ui-line bg-ui-surface"} ${answer && !shown ? "opacity-50" : ""}`}>
                        {option}
                        {shown ? correct ? <CheckIcon className="size-5 shrink-0 text-ui-success"/> : <XIcon className="size-5 shrink-0 text-ui-error"/> : null}
                    </button>;
                })}
            </div>
            {answer ? <div role="status" className="grid gap-2 animate-[hero-fade_0.3s_ease-out]">
                {right ? <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ui-accent"><StarIcon className="size-4" fill="currentColor"/>Right. One more star.</p>
                    : <p className="text-[15px] font-semibold text-ui-muted">Not quite. Here’s why:</p>}
                <p className="text-[14px] leading-[21px] text-ui-muted">{QUESTION.because}</p>
                {next ? <div className="mt-2">{next}</div> : null}
            </div> : null}
        </div>
        {layer}
    </div>;
}
