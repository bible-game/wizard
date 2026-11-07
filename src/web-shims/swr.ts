/** Stand-in for SWR: the wizard has no services, so a request answers with what the page passed as its fallback */
export default function useSWR<T = any>(_key: string | null, _fetcher: unknown, options?: { fallbackData?: T; onSuccess?: (data: T) => void; [option: string]: unknown }) {
    return { data: options?.fallbackData as T, error: undefined, isLoading: false, mutate: () => {} };
}
