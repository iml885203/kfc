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
export function shouldShowLine(
	line: string,
	pattern: string,
	ignoreCase: boolean,
	invert: boolean
): boolean {
	if (!pattern) return true;

	try {
		const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
		const matches = regex.test(line);
		return invert ? !matches : matches;
	} catch (e) {
		// Fallback for invalid regex: show line (safer than hiding)
		return true;
	}
}

/**
 * Filter lines based on pattern and context
 */
export function filterLines(
	lines: BufferedLine[],
	pattern: string,
	ignoreCase: boolean,
	invert: boolean,
	contextLines: number,
	beforeLines: number,
	afterLines: number
): FilteredLine[] {
	if (!pattern) {
		return lines.map((line, index) => ({
			bufferedLine: line,
			isMatch: false,
			index,
		}));
	}

	let regex: RegExp;
	try {
		regex = new RegExp(pattern, ignoreCase ? 'i' : '');
	} catch (e) {
		// Invalid regex: return all lines as non-matches (same as no filter)
		return lines.map((line, index) => ({
			bufferedLine: line,
			isMatch: false,
			index,
		}));
	}

	// Find matching lines
	const matchIndices = new Set<number>();
	lines.forEach((line, index) => {
		const matches = regex.test(line.line);
		const isMatch = invert ? !matches : matches;
		if (isMatch) {
			matchIndices.add(index);
		}
	});

	// Add context lines
	const linesToShow = new Set<number>();
	const before = contextLines > 0 ? contextLines : beforeLines;
	const after = contextLines > 0 ? contextLines : afterLines;

	matchIndices.forEach((matchIdx) => {
		// Add the match itself
		linesToShow.add(matchIdx);

		// Add before context
		for (let i = Math.max(0, matchIdx - before); i < matchIdx; i++) {
			linesToShow.add(i);
		}

		// Add after context
		for (let i = matchIdx + 1; i <= Math.min(lines.length - 1, matchIdx + after); i++) {
			linesToShow.add(i);
		}
	});

	// Convert to array and sort
	const result: FilteredLine[] = [];
	Array.from(linesToShow)
		.sort((a, b) => a - b)
		.forEach((index) => {
			result.push({
				bufferedLine: lines[index],
				isMatch: matchIndices.has(index),
				index,
			});
		});

	return result;
}

/**
 * Get indices of lines that should be shown with context
 */
export function getContextIndices(
	matchIndices: Set<number>,
	totalLines: number,
	before: number,
	after: number
): Set<number> {
	const indices = new Set<number>();

	matchIndices.forEach((matchIdx) => {
		// Add the match itself
		indices.add(matchIdx);

		// Add before context
		for (let i = Math.max(0, matchIdx - before); i < matchIdx; i++) {
			indices.add(i);
		}

		// Add after context
		for (let i = matchIdx + 1; i <= Math.min(totalLines - 1, matchIdx + after); i++) {
			indices.add(i);
		}
	});

	return indices;
}
