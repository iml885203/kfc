/**
 * Log filtering utilities
 * Pure functions for filtering and processing log lines
 */
export interface BufferedLine {
    podPrefix: string;
    line: string;
    coloredLine: string;
    timestamp: number;
}
export interface FilteredLine {
    bufferedLine: BufferedLine;
    isMatch: boolean;
    index: number;
}
export interface FilterOptions {
    pattern: string;
    ignoreCase: boolean;
    invert: boolean;
    contextLines: number;
    beforeLines: number;
    afterLines: number;
}
/**
 * Check if a line should be shown based on filter criteria
 * @note This creates a new RegExp every call. For bulk filtering, use filterLines.
 */
export declare function shouldShowLine(line: string, pattern: string, ignoreCase: boolean, invert: boolean): boolean;
/**
 * Filter lines based on pattern and context
 */
export declare function filterLines(lines: BufferedLine[], pattern: string, ignoreCase: boolean, invert: boolean, contextLines: number, beforeLines: number, afterLines: number): FilteredLine[];
/**
 * Get indices of lines that should be shown with context
 */
export declare function getContextIndices(matchIndices: Set<number>, totalLines: number, before: number, after: number): Set<number>;
