/**
 * Stand-in for the few HeroUI pieces the Play page uses (the wizard leaves HeroUI out): a popover above or below its
 * trigger, a modal sheet, a full-screen drawer, a button and an avatar. Same props as HeroUI's, as far as Play uses
 * them, and the same classNames slots, so the copied components render as they do in the webapp
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Slots = { base?: string; content?: string; arrow?: string; backdrop?: string; wrapper?: string; [slot: string]: string | undefined };
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** isOpen, onOpen, onClose, onOpenChange: HeroUI's open state hook */
export function useDisclosure(initial = false) {
    const [isOpen, setOpen] = useState(initial);
    return { isOpen, onOpen: () => setOpen(true), onClose: () => setOpen(false), onOpenChange: (open?: boolean) => setOpen(o => open ?? !o) };
}

/** Open state that may be controlled (isOpen, onOpenChange) or the component's own */
function useOpen(isOpen?: boolean, onOpenChange?: (open: boolean) => void) {
    const [own, setOwn] = useState(false);
    const open = isOpen ?? own;
    const set = useCallback((next: boolean) => { if (isOpen === undefined) setOwn(next); onOpenChange?.(next); }, [isOpen, onOpenChange]);
    return [open, set] as const;
}

// --- Popover ---------------------------------------------------------------------------------------------------------

type Placement = "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "right";
export type PopoverProps = { placement?: Placement; offset?: number; showArrow?: boolean; isOpen?: boolean; onOpenChange?: (open: boolean) => void; classNames?: Slots; children: React.ReactNode };
const PopoverContext = createContext<{ open: boolean; set: (o: boolean) => void; props: PopoverProps } | null>(null);

export function Popover(props: PopoverProps) {
    const [open, set] = useOpen(props.isOpen, props.onOpenChange);
    const box = useRef<HTMLSpanElement>(null);
    // a tap anywhere else, or Escape, closes it
    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) set(false); };
        const key = (e: KeyboardEvent) => { if (e.key === "Escape") set(false); };
        document.addEventListener("pointerdown", away); document.addEventListener("keydown", key);
        return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
    }, [open, set]);
    return <PopoverContext.Provider value={{ open, set, props }}>
        <span ref={box} className="relative inline-flex">{props.children}</span>
    </PopoverContext.Provider>;
}

export function PopoverTrigger({ children }: { children: React.ReactElement<any> }) {
    const ctx = useContext(PopoverContext)!;
    return React.cloneElement(children, {
        "aria-expanded": ctx.open,
        onClick: (e: React.MouseEvent) => { children.props.onClick?.(e); ctx.set(!ctx.open); },
    });
}

export function PopoverContent({ children }: { children: React.ReactNode | ((titleProps: object) => React.ReactNode) }) {
    const ctx = useContext(PopoverContext)!;
    if (!ctx.open) return null;
    const { placement = "top", offset = 8, showArrow, classNames } = ctx.props;
    const above = !placement.startsWith("bottom");
    const align = placement.endsWith("start") ? "left-0" : placement.endsWith("end") ? "right-0" : "left-1/2 -translate-x-1/2";
    const arrowAt = placement.endsWith("start") ? "left-4" : placement.endsWith("end") ? "right-4" : "left-1/2 -translate-x-1/2";
    return <span role="dialog" className={cx("absolute z-50 flex flex-col", align, classNames?.content)}
                 style={above ? { bottom: `calc(100% + ${offset}px)` } : { top: `calc(100% + ${offset}px)` }}>
        {typeof children === "function" ? children({}) : children}
        {showArrow && <span aria-hidden="true" className={cx("absolute size-2.5 rotate-45", arrowAt, above ? "-bottom-[5px]" : "-top-[5px]", classNames?.arrow)}/>}
    </span>;
}

// --- Modal and Drawer ------------------------------------------------------------------------------------------------

type SheetProps = { isOpen?: boolean; onOpenChange?: (open: boolean) => void; onClose?: () => void; placement?: string; backdrop?: string; size?: string; radius?: string;
    hideCloseButton?: boolean; isDismissable?: boolean; classNames?: Slots; className?: string; children: React.ReactNode; "aria-label"?: string; [key: string]: unknown };
const SheetContext = createContext<() => void>(() => {});

function Sheet({ isOpen, onOpenChange, onClose, placement = "center", classNames, className, children, drawer, ...rest }: SheetProps & { drawer?: boolean }) {
    const close = useCallback(() => { onOpenChange?.(false); onClose?.(); }, [onOpenChange, onClose]);
    useEffect(() => {
        if (!isOpen) return;
        const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", key);
        return () => document.removeEventListener("keydown", key);
    }, [isOpen, close]);
    if (!isOpen) return null;
    const where = drawer ? "inset-0" : placement === "bottom" ? "inset-x-0 bottom-0 flex items-end justify-center" : "inset-0 flex items-center justify-center p-4";
    return createPortal(<div className="fixed inset-0 z-[60]">
        <div className={cx("absolute inset-0 bg-black/50 backdrop-blur-sm", classNames?.backdrop)} onClick={close}/>
        <div className={cx("absolute", where)}>
            <section role="dialog" aria-modal="true" aria-label={rest["aria-label"] as string}
                     className={cx("relative flex max-h-full flex-col overflow-auto", drawer ? "h-full w-full" : "w-full", classNames?.base, className)}>
                <SheetContext.Provider value={close}>{children}</SheetContext.Provider>
            </section>
        </div>
    </div>, document.body);
}

export const Modal = (props: SheetProps) => <Sheet {...props}/>;
export const Drawer = (props: SheetProps) => <Sheet {...props} drawer/>;

function Content({ children }: { children: React.ReactNode | ((onClose: () => void) => React.ReactNode) }) {
    const close = useContext(SheetContext);
    return <>{typeof children === "function" ? children(close) : children}</>;
}
export const ModalContent = Content, DrawerContent = Content;

const part = (base: string) => ({ className, children }: { className?: string; children?: React.ReactNode }) => <div className={cx(base, className)}>{children}</div>;
export const ModalHeader = part("flex flex-col gap-1 px-6 py-4 text-[18px] font-semibold"), ModalBody = part("flex flex-1 flex-col gap-3 px-6 py-2"),
    ModalFooter = part("flex justify-end gap-2 px-6 py-4");
export const DrawerHeader = part("flex px-6 py-4"), DrawerBody = part("flex flex-1 flex-col overflow-y-auto px-6 py-2"), DrawerFooter = part("flex px-6 py-4");

// --- Button and Avatar -----------------------------------------------------------------------------------------------

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> & { onPress?: () => void; isIconOnly?: boolean; isDisabled?: boolean; disableRipple?: boolean;
    variant?: string; color?: string; size?: string; radius?: string; fullWidth?: boolean };
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ onPress, onClick, isIconOnly, isDisabled, disableRipple, variant, color, size, radius, fullWidth, className, ...rest }, ref) =>
    <button ref={ref} type="button" disabled={isDisabled} className={cx("inline-flex items-center justify-center gap-2 disabled:opacity-40", isIconOnly && "shrink-0", fullWidth && "w-full", className)}
            onClick={e => { onClick?.(e); onPress?.(); }} {...rest}/>);

export const Avatar = ({ name, className }: { name?: string; className?: string }) =>
    <span className={cx("inline-flex items-center justify-center rounded-full", className)}>{name}</span>;
