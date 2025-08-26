import React from 'react';

const store = new Map<string, any>();
const listeners = new Map<string, Set<Function>>();

export class QueryClient {
    // minimal stub
}

export function QueryClientProvider({ children }: any) {
    return React.createElement(React.Fragment, null, children);
}

export function useQueryClient() {
    return {
        cancelQueries: async () => { },
        getQueryData: (key: any) => store.get(JSON.stringify(key)),
        setQueryData: (key: any, val: any) => {
            const k = JSON.stringify(key);
            store.set(k, val);
            const s = listeners.get(k);
            if (s) {
                for (const cb of s) cb(val);
            }
        },
        invalidateQueries: async (key: any) => { },
    };
}

export function useQuery(key: any, fn: any) {
    const [data, setData] = React.useState<any>(() => {
        const cur = store.get(JSON.stringify(key));
        return cur === undefined ? undefined : cur;
    });
    React.useEffect(() => {
        let mounted = true;
        Promise.resolve()
            .then(() => fn())
            .then((res) => {
                if (!mounted) return;
                store.set(JSON.stringify(key), res);
                setData(res);
            })
            .catch(() => { });
        // subscribe to setQueryData notifications
        const k = JSON.stringify(key);
        let s = listeners.get(k);
        if (!s) { s = new Set(); listeners.set(k, s); }
        const cb = (val: any) => { if (mounted) setData(val); };
        s.add(cb);
        return () => { mounted = false; };
    }, [JSON.stringify(key)]);
    return { data };
}

export function useMutation(fn: any, opts: any = {}) {
    const qc = useQueryClient();
    return {
        mutateAsync: async (payload: any) => {
            if (opts.onMutate) await opts.onMutate(payload);
            try {
                const res = await fn(payload);
                if (opts.onSettled) opts.onSettled();
                return res;
            } catch (err) {
                if (opts.onError) opts.onError(err, payload, undefined);
                throw err;
            }
        },
        mutate: (payload: any) => {
            // call onMutate synchronously to enable optimistic updates
            if (opts.onMutate) { try { opts.onMutate(payload); } catch (e) { /* swallow */ } }
            Promise.resolve()
                .then(() => fn(payload))
                .then((res) => {
                    if (opts.onSettled) opts.onSettled();
                    return res;
                })
                .catch((err) => {
                    if (opts.onError) opts.onError(err, payload, undefined);
                });
        }
    };
}

export default {
    QueryClient,
    QueryClientProvider,
    useQueryClient,
    useQuery,
    useMutation,
};
