import React from "react";

/** A stage's reason for being, in one line across its top: why this part of the day matters, before what to do in it */
export default function Why({ children }: { children: React.ReactNode }) {
    return <p className="flex shrink-0 items-center justify-center gap-2 border-b border-ui-line px-6 py-2.5 text-center text-[14px] font-medium leading-5 text-ui-text max-[440px]:px-4">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-play-gold shadow-[0_0_6px_rgba(212,180,85,0.6)]"/>
        <span className="text-balance">{children}</span>
    </p>;
}
