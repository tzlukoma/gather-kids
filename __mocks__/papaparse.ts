// Manual mock for papaparse used in tests. Exposes a `parse` function
// that reads a File/blob via .text() and calls the provided callbacks.
export const parse = (file: any, opts: any) => {
    const readText = () => {
        if (file && typeof file.text === 'function') return Promise.resolve().then(() => file.text());
        return new Promise<string>((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            } catch (err) {
                reject(err);
            }
        });
    };

    readText()
        .then((txt: string) => {
            const lines = txt.split(/\r?\n/).filter(Boolean);
            const headers = lines[0].split(',').map((h: string) => h.trim());
            const data = lines.slice(1).map((l: string) => {
                const cols = l.split(',');
                const row: any = {};
                headers.forEach((h: string, i: number) => {
                    row[h] = cols[i]?.trim();
                });
                return row;
            });
            if (opts && typeof opts.complete === 'function') {
                opts.complete({ data });
            }
        })
        .catch((err: any) => {
            if (opts && typeof opts.error === 'function') opts.error(err);
        });
};

export default { parse };
