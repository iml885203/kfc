/**
 * Hook for managing log filter state
 */
import { useState, useCallback } from 'react';
export function useLogFilter(initialPattern, initialAfter = 0, initialBefore = 0, initialContext = 0, initialIgnoreCase = false, initialInvert = false) {
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
//# sourceMappingURL=useLogFilter.js.map