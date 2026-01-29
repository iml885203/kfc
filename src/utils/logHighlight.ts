/**
 * Log highlighting utilities
 * Functions for highlighting matching text in log lines
 */

import chalk from 'chalk';

/**
 * Highlight matching text in a line with yellow background
 */
export function highlightMatches(
	text: string,
	pattern: string,
	ignoreCase: boolean
): string {
	if (!pattern) return text;

	try {
		const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g');
		return text.replace(regex, (match) => chalk.black.bgYellow(match));
	} catch (error) {
		// If regex is invalid, return original text
		return text;
	}
}

/**
 * Check if text contains a match for the pattern
 */
export function hasMatch(
	text: string,
	pattern: string,
	ignoreCase: boolean
): boolean {
	if (!pattern) return false;

	try {
		const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
		return regex.test(text);
	} catch (error) {
		return false;
	}
}

/**
 * Get all matches in a text
 */
export function getMatches(
	text: string,
	pattern: string,
	ignoreCase: boolean
): string[] {
	if (!pattern) return [];

	try {
		const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g');
		return text.match(regex) || [];
	} catch (error) {
		return [];
	}
}
