import React, { useState } from "react";
import { ArrowRightIcon, CheckIcon, StarIcon, XIcon } from "lucide-react";
import { PRACTICE, QUESTIONS, SUMMARY } from "@/demo/practice";
import { evenly, useStepTips, type StepTip } from "@/demo/tour";
import type { MotionValue } from "framer-motion";

const TIPS: StepTip[] = [
    { id: "steps", target: "steps", title: "Five questions", text: `A study asks four questions about ${PRACTICE.book} ${PRACTICE.chapter}, then for a summary in your own words.` },
];

const QUIZ = QUESTIONS.length + 1;

/**
 * Study, shown: the quiz as the app has it, all five steps for the visitor to go through: four questions (each locks
 * on the first answer, shows why, then moves on) and a summary. Every right answer earns a star (the summary isn't
 * graded here: the app grades it on the server),
 * which flies up from where it was earned. A tooltip explains the five questions
 */
export default function StudyStep({ progress, active, onStar, stars }: { progress: MotionValue<number>; active: boolean; onStar: (from: Element) => void; stars: number }) {
    const [at, setAt] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [summary, setSummary] = useState("");
    const [sent, setSent] = useState(false);
    const question = QUESTIONS[at];
    const answer = answers[at];

    function choose(option: string, from: Element) {
        if (answer) return;
        setAnswers(a => { const next = [...a]; next[at] = option; return next; });
        if (option === question.correct) onStar(from);
    }

    function send(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!sent) setSent(true);
    }

    const done = sent;
    const { root, tip, layer } = useStepTips(progress, active, evenly(TIPS));
    return <div ref={root} className="relative flex h-full flex-col">{<>
        {/* the quiz's progress, as five ruled cells: four questions and the summary */}
        <div ref={tip("steps")} className="grid shrink-0 gap-2 px-6 pt-4 max-[440px]:px-4">
            <div className="flex gap-1" aria-hidden="true">{[...Array(QUIZ)].map((_, i) => <span key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < at || done ? "bg-ui-muted" : i === at ? "bg-ui-text" : "bg-ui-line"}`}/>)}</div>
            <p className="text-[13px] text-ui-muted">{done ? "Study complete" : `Question ${at + 1} of ${QUIZ}`} · {PRACTICE.book} {PRACTICE.chapter}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pt-5 max-[440px]:px-4">
            {question ? <div className="grid gap-4">
                <p id="question" className="text-balance font-condensed text-[24px] font-medium leading-[30px]">{question.content}</p>
                <div role="group" aria-labelledby="question" className="grid gap-2.5">
                    {question.options.map(option => {
                        const chosen = answer === option, correct = option === question.correct;
                        const shown = answer && (chosen || correct);
                        return <button key={option} type="button" onClick={e => choose(option, e.currentTarget)} disabled={!!answer}
                                       className={`flex min-h-[52px] items-center justify-between gap-2 rounded-lg border px-4 text-left text-[17px] transition enabled:hover:bg-ui-raised ${shown
                                           ? correct ? "border-ui-success/60 bg-ui-success/10" : "border-ui-error/60 bg-ui-error/10" : "border-ui-line bg-ui-surface"} ${answer && !shown ? "opacity-50" : ""}`}>
                            {option}
                            {shown ? correct ? <CheckIcon className="size-5 text-ui-success"/> : <XIcon className="size-5 text-ui-error"/> : null}
                        </button>;
                    })}
                </div>
            </div> : null}
            {question ? <>
                <p role="status" className="min-h-10 text-[14px] leading-5 text-ui-muted">{answer ? `${answer === question.correct ? "Right." : "Not quite."} ${question.because}` : ""}</p>
                {answer ? <button type="button" onClick={() => setAt(at + 1)} className="ui-button h-12 animate-[hero-fade_0.25s_ease-out] !text-[16px] [&_svg]:size-5">
                    {at + 1 < QUESTIONS.length ? "Next question" : "Last: the summary"}<ArrowRightIcon/>
                </button> : null}
            </> : <form onSubmit={send} className="grid gap-3">
                <label htmlFor="summary" className="text-balance font-condensed text-[24px] font-medium leading-[30px]">{SUMMARY.content}</label>
                <textarea id="summary" rows={3} value={summary} onChange={e => setSummary(e.target.value)} disabled={sent} placeholder={SUMMARY.placeholder}
                          className="resize-none rounded-lg border border-ui-line bg-ui-surface px-4 py-3 text-[17px] leading-6 text-ui-text placeholder:text-ui-faint focus:border-ui-muted focus:outline-none"/>
                {sent ? <p role="status" className="text-[14px] leading-5 text-ui-muted">Thanks. That’s the study done: in the app, your summary is read back against the chapter’s.</p>
                    : <button type="submit" disabled={!summary.trim()} className="ui-button ui-primary h-12 !text-[16px] disabled:opacity-50">Send summary</button>}
            </form>}
        </div>

        {/* what the study is worth: the stars, lit as they're earned */}
        <div className="mx-6 mb-4 flex shrink-0 items-center justify-between rounded-lg border border-ui-line bg-ui-surface px-4 py-3 max-[440px]:mx-4">
            <span className="text-[14px] text-ui-muted">{stars ? `+${stars} ${stars === 1 ? "star" : "stars"} for studying` : "Study stars"}</span>
            <span className="flex gap-1" aria-label={`${stars} of ${QUESTIONS.length} stars`}>
                {[...Array(QUESTIONS.length)].map((_, i) => <StarIcon key={i} aria-hidden="true" strokeWidth={1.5}
                                                       className={`size-5 transition ${i < stars ? "text-ui-accent drop-shadow-[0_0_6px_rgba(212,180,85,0.45)]" : "text-ui-faint"}`}
                                                       fill={i < stars ? "currentColor" : "none"}/>)}
            </span>
        </div>
        {layer}
    </>}</div>;
}

/** The step's share of the tour's scroll, as a share of the screen's height */
export const STUDY_LENGTH = 80;
