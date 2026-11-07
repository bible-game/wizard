/** Stand-in for @sentry/nextjs: the wizard has no Sentry, so what Play would report goes to the console */
export function captureMessage(message: string, context?: unknown): void { console.warn(message, context); }
export function captureException(error: unknown): void { console.error(error); }
