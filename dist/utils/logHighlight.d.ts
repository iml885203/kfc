/**
 * Log highlighting utilities
 * Functions for highlighting matching text in log lines
 */
/**
 * Highlight matching text in a line with yellow background
 */
export declare function highlightMatches(text: string, pattern: string, ignoreCase: boolean): string;
/**
 * Check if text contains a match for the pattern
 */
export declare function hasMatch(text: string, pattern: string, ignoreCase: boolean): boolean;
/**
 * Get all matches in a text
 */
export declare function getMatches(text: string, pattern: string, ignoreCase: boolean): string[];
