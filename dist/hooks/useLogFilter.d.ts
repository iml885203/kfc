/**
 * Hook for managing log filter state
 */
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
export interface UseLogFilterReturn extends LogFilterState, LogFilterActions {
}
export declare function useLogFilter(initialPattern?: string, initialAfter?: number, initialBefore?: number, initialContext?: number, initialIgnoreCase?: boolean, initialInvert?: boolean): UseLogFilterReturn;
