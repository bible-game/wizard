import React, { useState } from "react";
import { BookOpenIcon, ChurchIcon, EyeIcon, EyeOffIcon, FlameIcon, LockIcon, MailIcon, PlayIcon, StarIcon, UserIcon } from "lucide-react";
import { toast } from "@/demo/toast";

type Field = { name: string; label: string; type: string; icon: typeof MailIcon; autoComplete: string; required?: boolean; hint?: string; half?: boolean };

// as the app's sign-up (account/sign-up), names first since they're the quickest to fill
const FIELDS: Field[] = [
    { name: "firstname", label: "First name", type: "text", icon: UserIcon, autoComplete: "given-name", required: true, half: true },
    { name: "lastname", label: "Last name", type: "text", icon: UserIcon, autoComplete: "family-name", required: true, half: true },
    { name: "email", label: "Email", type: "email", icon: MailIcon, autoComplete: "email", required: true },
    { name: "password", label: "Password", type: "password", icon: LockIcon, autoComplete: "new-password", required: true, hint: "At least 8 characters" },
    { name: "confirm", label: "Confirm password", type: "password", icon: LockIcon, autoComplete: "new-password", required: true },
    { name: "church", label: "Home church", type: "text", icon: ChurchIcon, autoComplete: "organization", hint: "Optional" },
];

/** The checks the app makes before it sends the form, in plain words */
function problems(values: Record<string, string>) {
    const out: Record<string, string> = {};
    for (const f of FIELDS) if (f.required && !values[f.name]?.trim()) out[f.name] = f.name === "confirm" ? "Confirm your password" : `Enter your ${f.label.toLowerCase()}`;
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) out.email = "Enter an email address, like name@example.com";
    if (values.password && values.password.length < 8) out.password = "Use at least 8 characters";
    if (values.confirm && values.confirm !== values.password) out.confirm = "The passwords don’t match";
    return out;
}

/**
 * The end of the tutorial (its 04 Stats): the visitor's numbers so far, in one line, heading sign-up in the page, so
 * they go straight into the new account. A demo: the form checks what it can, then says what the app would do
 */
export default function SignUp({ stars, streak, seen }: { stars: number; streak: number; seen: string }) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [shown, setShown] = useState(false);
    const [done, setDone] = useState(false);


    function submit(e: React.FormEvent) {
        e.preventDefault();
        const found = problems(values);
        setErrors(found);
        if (Object.keys(found).length) {
            document.getElementById(`sign-up-${Object.keys(found)[0]}`)?.focus();
            return;
        }
        setDone(true);
        toast(`Creates the account; ${stars === 1 ? "the star moves" : `the ${stars} stars move`} into it`);
    }

    const input = (f: Field) => {
        const id = `sign-up-${f.name}`, error = errors[f.name];
        const password = f.type === "password";
        return <div key={f.name} className={`grid min-w-0 gap-1.5 ${f.half ? "" : "col-span-2"}`}>
            <label htmlFor={id} className="flex items-baseline justify-between text-[14px] text-ui-muted">
                {f.label}{f.hint ? <span className="text-[12px] text-ui-faint">{f.hint}</span> : null}
            </label>
            <div className={`flex h-12 min-w-0 items-center gap-2.5 rounded-lg border bg-ui-surface px-3 focus-within:border-ui-muted ${error ? "border-ui-error/70" : "border-ui-line"}`}>
                <f.icon aria-hidden="true" className="size-[18px] shrink-0 text-ui-faint"/>
                <input id={id} name={f.name} type={password && shown ? "text" : f.type} autoComplete={f.autoComplete} required={f.required}
                       aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined}
                       value={values[f.name] ?? ""} onChange={e => { setValues(v => ({ ...v, [f.name]: e.target.value })); setErrors(({ [f.name]: _, ...rest }) => rest); }}
                       className="w-0 min-w-0 flex-1 bg-transparent text-[16px] text-ui-text placeholder:text-ui-faint focus:outline-none"/>
                {password ? <button type="button" onClick={() => setShown(s => !s)} aria-label={shown ? "Hide passwords" : "Show passwords"}
                                    className="-mr-1 flex size-9 items-center justify-center rounded-lg text-ui-faint hover:text-ui-text">
                    {shown ? <EyeOffIcon className="size-[18px]"/> : <EyeIcon className="size-[18px]"/>}
                </button> : null}
            </div>
            {error ? <p id={`${id}-error`} className="text-[13px] text-ui-error">{error}</p> : null}
        </div>;
    };

    const figures = [
        { label: "Stars", value: stars, icon: StarIcon, colour: "text-ui-accent", fill: true },
        { label: "Day streak", value: streak, icon: FlameIcon, colour: "text-ui-orange" },
        { label: "Bible seen", value: seen, icon: BookOpenIcon, colour: "text-ui-text" },
    ];
    return <section id="stats" aria-labelledby="sign-up-h" className="relative mt-10 grid scroll-mt-16 gap-5">
        {/* the numbers so far, as Statistics shows them, in a single line */}
        <dl className="grid grid-cols-3 divide-x divide-ui-line rounded-lg border border-ui-line bg-ui-surface py-3.5">
            {figures.map(({ label, value, icon: Icon, colour, fill }) => <div key={label} className="grid min-w-0 justify-items-center gap-1 px-2">
                <dt className="truncate text-[13px] text-ui-muted">{label}</dt>
                <dd className="flex items-center gap-1.5 text-[26px] font-semibold leading-8 tabular-nums">
                    <Icon aria-hidden="true" className={`size-5 ${colour}`} fill={fill ? "currentColor" : "none"}/>{value}
                </dd>
            </div>)}
        </dl>
        <h2 id="sign-up-h" role={done ? "status" : undefined} className="text-balance text-center text-[22px] font-semibold leading-7">{done ? "You’re all set" : "Create your account"}</h2>
        {/* signed up: "You're all set" says it, and the next thing is today's game */}
        {done ? <div className="grid gap-4 animate-[hero-fade_0.3s_ease-out]">
            <button type="button" autoFocus onClick={() => toast("Opens today’s game on Play")} className="ui-button ui-primary h-12 !text-[16px] [&_svg]:size-5">
                <PlayIcon/>Play today&apos;s chapter
            </button>
        </div> : <form noValidate onSubmit={submit} className="grid grid-cols-2 gap-x-3 gap-y-4">
            {FIELDS.map(input)}
            <button type="submit" className="ui-button ui-primary col-span-2 mt-1 h-12 !text-[16px]">Sign Up</button>
        </form>}
    </section>;
}
