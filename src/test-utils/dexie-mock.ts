// Minimal in-memory Dexie-like mock used for Node/Jest environments where
// IndexedDB is not available. Provides basic table operations used in tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
type RecordObj = { [k: string]: any };

function createCollection(store: Map<string, RecordObj>, initialFilter?: (item: any) => boolean) {
    return {
        and: (predicate: (item: any) => boolean) => {
            const combinedFilter = initialFilter 
                ? (item: any) => initialFilter(item) && predicate(item)
                : predicate;
            return createCollection(store, combinedFilter);
        },
        offset: (n: number) => {
            const currentFilter = initialFilter || (() => true);
            return {
                limit: (count: number) => ({
                    toArray: async () => {
                        const filtered = Array.from(store.values()).filter(currentFilter);
                        return filtered.slice(n, n + count);
                    }
                }),
                toArray: async () => {
                    const filtered = Array.from(store.values()).filter(currentFilter);
                    return filtered.slice(n);
                }
            };
        },
        limit: (count: number) => ({
            toArray: async () => {
                const filtered = Array.from(store.values()).filter(initialFilter || (() => true));
                return filtered.slice(0, count);
            }
        }),
        toArray: async () => {
            const filtered = Array.from(store.values()).filter(initialFilter || (() => true));
            return filtered;
        }
    };
}

function createTable(primaryKey: string) {
    const store = new Map<string, RecordObj>();

    const table = {
    async add(obj: RecordObj) {
            const key = obj[primaryKey];
            if (!key) throw new Error(`Missing primary key ${primaryKey}`);
            store.set(String(key), JSON.parse(JSON.stringify(obj)));
            return key;
        },
        async bulkAdd(items: RecordObj[]) {
            for (const obj of items) {
                const key = obj[primaryKey];
                if (!key) throw new Error(`Missing primary key ${primaryKey}`);
                store.set(String(key), JSON.parse(JSON.stringify(obj)));
            }
            return items.map(i => i[primaryKey]);
        },
        async put(obj: RecordObj) {
            const key = obj[primaryKey];
            if (!key) throw new Error(`Missing primary key ${primaryKey}`);
            store.set(String(key), JSON.parse(JSON.stringify(obj)));
            return key;
        },
        async bulkPut(items: RecordObj[]) {
            for (const obj of items) {
                const key = obj[primaryKey];
                if (!key) throw new Error(`Missing primary key ${primaryKey}`);
                store.set(String(key), JSON.parse(JSON.stringify(obj)));
            }
            return items.map(i => i[primaryKey]);
        },
        async get(id: string) {
            return store.get(String(id)) as RecordObj | undefined;
        },
        async update(id: string, patch: Record<string, any>) {
            const cur = store.get(String(id)) || {};
            const merged = { ...cur, ...patch };
            store.set(String(id), merged);
            return 1;
        },
    where(filter: unknown) {
            // filter can be a key string (index), a composite like '[a+b]', or an equality object
            if (typeof filter === 'string') {
                const index = filter;
                const isComposite = index.startsWith('[') && index.endsWith(']');
                if (isComposite) {
                    const keys = index.slice(1, -1).split('+').map(s => s.trim());
                    return {
                        equals: (vals: any[]) => ({
                            toArray: async () => {
                                const res: any[] = [];
                                for (const v of store.values()) {
                                    let match = true;
                                    for (let i = 0; i < keys.length; i++) {
                                        if (v[keys[i]] !== vals[i]) match = false;
                                    }
                                    if (match) res.push(v);
                                }
                                return res;
                            }
                        }),
                        anyOf: (vals: any[]) => ({
                            toArray: async () => {
                                const res: any[] = [];
                                for (const v of store.values()) {
                                    if (vals.includes(v[index])) res.push(v);
                                }
                                return res;
                            }
                        }),
                        toArray: async () => Array.from(store.values()),
                    };
                }

                return {
                    equals: (val: any) => {
                        const filteredPredicate = (v: any) => v[index] === val;
                        return {
                            ...createCollection(store, filteredPredicate),
                            toArray: async () => {
                                const res: any[] = [];
                                for (const v of store.values()) {
                                    if (v[index] === val) res.push(v);
                                }
                                return res;
                            },
                            sortBy: async (key: string) => {
                                const res: any[] = [];
                                for (const v of store.values()) {
                                    if (v[index] === val) res.push(v);
                                }
                                return res.sort((a, b) => {
                                    const av = a[key]; const bv = b[key];
                                    if (av === bv) return 0; return (av ?? 0) < (bv ?? 0) ? -1 : 1;
                                });
                            }
                        };
                    },
                    anyOf: (vals: any[]) => ({
                        toArray: async () => {
                            const res: any[] = [];
                            for (const v of store.values()) {
                                if (vals.includes(v[index])) res.push(v);
                            }
                            return res;
                        }
                    }),
                    toArray: async () => Array.from(store.values()),
                    count: async () => Array.from(store.values()).length,
                };
            }

            if (typeof filter === 'object' && filter !== null) {
                const filt = filter as Record<string, any>;
                return {
                    toArray: async () => {
                        const res: any[] = [];
                        for (const v of store.values()) {
                            let match = true;
                            for (const k of Object.keys(filt)) {
                                if ((v as Record<string, any>)[k] !== filt[k]) { match = false; break; }
                            }
                            if (match) res.push(v);
                        }
                        return res;
                    },
                    delete: async () => {
                        for (const [k, v] of Array.from(store.entries())) {
                            let match = true;
                            for (const fk of Object.keys(filt)) {
                                if ((v as Record<string, any>)[fk] !== filt[fk]) { match = false; break; }
                            }
                            if (match) store.delete(k);
                        }
                    },
                    count: async () => {
                        const arr = [] as any[];
                        for (const v of store.values()) {
                            let match = true;
                            for (const fk of Object.keys(filt)) {
                                if ((v as Record<string, any>)[fk] !== filt[fk]) { match = false; break; }
                            }
                            if (match) arr.push(v);
                        }
                        return arr.length;
                    }
                };
            }

            return {
                toArray: async () => Array.from(store.values()),
            };
        },
        orderBy: (key: string) => ({
            reverse: () => ({
                toArray: async () => Array.from(store.values()).sort((a, b) => {
                    const av = (a as Record<string, any>)[key]; const bv = (b as Record<string, any>)[key];
                    if (av === bv) return 0; return (av as any) < (bv as any) ? 1 : -1;
                })
            }),
            toArray: async () => {
                // Handle composite keys like '[first_name+last_name]'
                if (key.startsWith('[') && key.endsWith(']')) {
                    const keys = key.slice(1, -1).split('+').map(s => s.trim());
                    return Array.from(store.values()).sort((a, b) => {
                        for (const k of keys) {
                            const av = (a as Record<string, any>)[k] || '';
                            const bv = (b as Record<string, any>)[k] || '';
                            if (av !== bv) {
                                return (av as any) < (bv as any) ? -1 : 1;
                            }
                        }
                        return 0;
                    });
                } else {
                    return Array.from(store.values()).sort((a, b) => {
                        const av = (a as Record<string, any>)[key]; const bv = (b as Record<string, any>)[key];
                        if (av === bv) return 0; return (av as any) < (bv as any) ? -1 : 1;
                    });
                }
            }
        }),
        toArray: async () => Array.from(store.values()),
        toCollection: () => createCollection(store),
        delete: async (id: string) => {
            const exists = store.has(String(id));
            store.delete(String(id));
            return exists ? 1 : 0;
        },
        filter: (predicate: (item: any) => boolean) => ({
            toArray: async () => Array.from(store.values()).filter(predicate)
        }),
        _internalStore: store,
    };
    return table;
}

export function createInMemoryDB() {
    return {
        households: createTable('household_id'),
        guardians: createTable('guardian_id'),
        emergency_contacts: createTable('contact_id'),
        children: createTable('child_id'),
        registration_cycles: createTable('cycle_id'),
        child_year_profiles: createTable('child_year_profile_id'),
        registrations: createTable('registration_id'),
        ministries: createTable('ministry_id'),
        ministry_enrollments: createTable('enrollment_id'),
        leader_assignments: createTable('assignment_id'), // Legacy
        // NEW: Leader Management Tables
        leader_profiles: createTable('leader_id'),
        ministry_leader_memberships: createTable('membership_id'),
        ministry_accounts: createTable('ministry_id'),
        users: createTable('user_id'),
        events: createTable('event_id'),
        attendance: createTable('attendance_id'),
        incidents: createTable('incident_id'),
        // Bible Bee stores
        competitionYears: createTable('id'),
        scriptures: createTable('id'),
        gradeRules: createTable('id'),
        studentScriptures: createTable('id'),
        studentEssays: createTable('id'),
        audit_logs: createTable('log_id'),
        // Additional Bible Bee tables needed by IndexedDBAdapter
        bible_bee_years: createTable('year_id'),
        divisions: createTable('division_id'),
        essay_prompts: createTable('prompt_id'),
        enrollments: createTable('id'),
        enrollment_overrides: createTable('override_id'),
        // Branding settings
        branding_settings: createTable('setting_id'),
        // Transaction support for tests
        transaction: async (mode: any, tables: any, callback: () => Promise<any>) => {
            return await callback();
        }
    } as any;
}

// When imported during Jest setup, mock the '@/lib/db' module to return
// this in-memory implementation if IndexedDB is not present.
export function setupDexieMockIfNeeded() {
    const hasIndexedDB = typeof indexedDB !== 'undefined';
    if (!hasIndexedDB) {
        const inMemory = createInMemoryDB();
        // Use Jest to mock the module so imports of '@/lib/db' get the mock
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (typeof jest !== 'undefined' && jest.mock) {
            // Note: jest.mock must receive a factory function
            jest.mock('@/lib/db', () => ({ db: inMemory }));
        }
    }
}
