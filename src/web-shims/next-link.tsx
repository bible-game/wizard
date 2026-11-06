/** Stand-in for next/link: a plain anchor (the wizard routes by hash; the webapp's paths go nowhere here) */
import React from "react";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string; [key: string]: unknown }; prefetch?: boolean; scroll?: boolean; replace?: boolean };
const Link = React.forwardRef<HTMLAnchorElement, Props>(({ href, prefetch, scroll, replace, onClick, ...rest }, ref) =>
    <a ref={ref} href={typeof href === "string" ? href : (href as { pathname?: string }).pathname} {...rest}
       onClick={e => { onClick?.(e); if (!e.defaultPrevented) e.preventDefault(); }}/>);
export default Link;
