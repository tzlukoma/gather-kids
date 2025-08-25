import React from 'react';

const store = new Map<string, any>();

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
        setQueryData: (key: any, val: any) => store.set(JSON.stringify(key), val),
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
        return () => { mounted = false; };
    }, [JSON.stringify(key)]);
    return { data };
}

export function useMutation(fn: any, opts: any = {}) {
    const qc = useQueryClient();
    return {
        mutateAsync: async (payload: any) => {
            const res = await fn(payload);
            if (opts.onSettled) opts.onSettled();
            return res;
        },
        mutate: (payload: any) => {
            Promise.resolve(fn(payload)).then((res) => {
                if (opts.onSettled) opts.onSettled();
                return res;
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
