/**
 * Hook for managing log filter state
 */

import { useState, useCallback } from 'react';

export interface LogFilterState {
	pattern: string;
	ignoreCase: boolean;
	invert: boolean;
	context: number;
	before: number;
	after: number;
}

export interface LogFilterActions {
	setPattern: (pattern: string) => void;
	toggleIgnoreCase: () => void;
	toggleInvert: () => void;
	increaseContext: () => void;
	decreaseContext: () => void;
	clearFilter: () => void;
}

export interface UseLogFilterReturn extends LogFilterState, LogFilterActions {}

export function useLogFilter(
	initialPattern?: string,
	initialAfter: number = 0,
	initialBefore: number = 0,
	initialContext: number = 0,
	initialIgnoreCase: boolean = false,
	initialInvert: boolean = false
): UseLogFilterReturn {
	const [pattern, setPattern] = useState(initialPattern || '');
	const [ignoreCase, setIgnoreCase] = useState(initialIgnoreCase);
	const [invert, setInvert] = useState(initialInvert);
	const [context, setContext] = useState(initialContext);
	const [before] = useState(initialBefore);
	const [after] = useState(initialAfter);

	const toggleIgnoreCase = useCallback(() => {
		setIgnoreCase((prev) => !prev);
	}, []);

	const toggleInvert = useCallback(() => {
		setInvert((prev) => !prev);
	}, []);

	const increaseContext = useCallback(() => {
		setContext((prev) => Math.min(prev + 1, 20));
	}, []);

	const decreaseContext = useCallback(() => {
		setContext((prev) => Math.max(prev - 1, 0));
	}, []);

	const clearFilter = useCallback(() => {
		setPattern('');
		setIgnoreCase(false);
		setInvert(false);
		setContext(0);
	}, []);

	return {
		pattern,
		ignoreCase,
		invert,
		context,
		before,
		after,
		setPattern,
		toggleIgnoreCase,
		toggleInvert,
		increaseContext,
		decreaseContext,
		clearFilter,
	};
}
