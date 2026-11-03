import React from "react";

/** A stage's reason for being, in one line across its top: why this part of the day matters, before what to do in it */
export default function Why({ children }: { children: React.ReactNode }) {
    // the dot runs in the text, so it stays beside the first word however the line wraps
    return <p className="shrink-0 text-balance border-b border-ui-line px-6 py-2.5 text-center text-[14px] font-medium leading-5 text-ui-text max-[440px]:px-4">
        <span aria-hidden="true" className="mb-0.5 mr-2 inline-block size-1.5 rounded-full bg-play-gold align-middle shadow-[0_0_6px_rgba(212,180,85,0.6)]"/>
        {children}
    </p>;
}
