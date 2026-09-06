'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Editable local state that is replaced whenever `sourceKey` changes.
 * Use instead of `useEffect(() => { setState(nextValue); }, [sourceKey])`.
 *
 * @see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function useStateWhenKeyChanges<T>(
	nextValue: T,
	sourceKey: unknown,
): [T, Dispatch<SetStateAction<T>>] {
	const [state, setState] = useState(nextValue);
	const [prevKey, setPrevKey] = useState(sourceKey);
	if (!Object.is(prevKey, sourceKey)) {
		setPrevKey(sourceKey);
		setState(nextValue);
	}
	return [state, setState];
}
