/** Stand-in for next/navigation: the Play page asks where it is, and redirects only to change day (not in the wizard) */
export const usePathname = () => "/play/today";
export const useRouter = () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => history.back() });
export function redirect(_to: string): void { /* the wizard stays on today's game */ }
