import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useStdout, useInput } from 'ink';
import Spinner from 'ink-spinner';
import chalk from 'chalk';
import { followLogs, LogLine } from '../k8s/client.js';
import { colorizeLogLine } from '../utils/colorize.js';

interface LogViewerProps {
	deployment: string;
	namespace: string;
	context?: string;
	tail: number;
	maxRetry: number;
	grepPattern?: string;
	grepAfter?: number;
	grepBefore?: number;
	grepContext?: number;
	grepIgnoreCase?: boolean;
	grepInvert?: boolean;
}

interface BufferedLine {
	podPrefix: string;
	line: string;
	coloredLine: string;
	timestamp: number;
}

export default function LogViewer({
	deployment,
	namespace,
	context,
	tail,
	maxRetry,
	grepPattern: initialPattern,
	grepAfter: initialAfter = 0,
	grepBefore: initialBefore = 0,
	grepContext: initialContext = 0,
	grepIgnoreCase: initialIgnoreCase = false,
	grepInvert: initialInvert = false,
}: LogViewerProps) {
	const { exit } = useApp();
	const { write } = useStdout();
	const [status, setStatus] = useState<string>('Connecting...');
	const [retryCount, setRetryCount] = useState(0);
	const [isConnected, setIsConnected] = useState(false);
	
	// Interactive filter state
	const [filterMode, setFilterMode] = useState(false);
	const [filterInput, setFilterInput] = useState('');
	const [grepPattern, setGrepPattern] = useState(initialPattern || '');
	const [grepIgnoreCase, setGrepIgnoreCase] = useState(initialIgnoreCase);
	const [grepInvert, setGrepInvert] = useState(initialInvert);
	const [grepContext, setGrepContext] = useState(initialContext);
	const [grepAfter, setGrepAfter] = useState(initialAfter);
	const [grepBefore, setGrepBefore] = useState(initialBefore);
	const [paused, setPaused] = useState(false);
	
	// Buffer for all lines (for re-filtering)
	const allLines = useRef<BufferedLine[]>([]);
	const maxBufferSize = 10000; // Keep last 10k lines
	const lastFilterState = useRef({ pattern: grepPattern, ignoreCase: grepIgnoreCase, invert: grepInvert, context: grepContext });

	// Highlight matching text in a line
	function highlightMatches(text: string, pattern: string, ignoreCase: boolean): string {
		if (!pattern) return text;
		
		try {
			const flags = ignoreCase ? 'gi' : 'g';
			const regex = new RegExp(pattern, flags);
			return text.replace(regex, (match) => chalk.black.bgYellow(match));
		} catch {
			return text;
		}
	}

	// Handle keyboard input
	useInput((input, key) => {
		if (filterMode) {
			// In filter mode, handle text input
			if (key.return) {
				// Apply filter
				setGrepPattern(filterInput);
				setFilterMode(false);
				// Trigger refilter
				refilterAndDisplay(filterInput, grepIgnoreCase, grepInvert, grepContext, grepBefore, grepAfter);
			} else if (key.escape) {
				// Cancel filter
				setFilterMode(false);
				setFilterInput('');
			} else if (key.backspace || key.delete) {
				setFilterInput(prev => prev.slice(0, -1));
			} else if (!key.ctrl && !key.meta && input) {
				setFilterInput(prev => prev + input);
			}
		} else {
			// Normal mode - keyboard shortcuts
			if (input === '/') {
				// Enter filter mode
				setFilterMode(true);
				setFilterInput(grepPattern);
			} else if (input === 'c') {
				// Clear filter
				const newPattern = '';
				setGrepPattern(newPattern);
				setGrepInvert(false);
				refilterAndDisplay(newPattern, grepIgnoreCase, false, grepContext, grepBefore, grepAfter);
			} else if (input === 'i') {
				// Toggle ignore case
				const newIgnoreCase = !grepIgnoreCase;
				setGrepIgnoreCase(newIgnoreCase);
				refilterAndDisplay(grepPattern, newIgnoreCase, grepInvert, grepContext, grepBefore, grepAfter);
			} else if (input === 'v') {
				// Toggle invert
				const newInvert = !grepInvert;
				setGrepInvert(newInvert);
				refilterAndDisplay(grepPattern, grepIgnoreCase, newInvert, grepContext, grepBefore, grepAfter);
			} else if (input === 'p') {
				// Toggle pause
				setPaused(prev => !prev);
			} else if (input === '+') {
				// Increase context
				const newContext = Math.min(grepContext + 1, 20);
				setGrepContext(newContext);
				refilterAndDisplay(grepPattern, grepIgnoreCase, grepInvert, newContext, grepBefore, grepAfter);
			} else if (input === '-') {
				// Decrease context
				const newContext = Math.max(grepContext - 1, 0);
				setGrepContext(newContext);
				refilterAndDisplay(grepPattern, grepIgnoreCase, grepInvert, newContext, grepBefore, grepAfter);
			} else if (input === 'q') {
				// Quit
				exit();
			} else if (input === '?') {
				// Show help
				showHelp();
			}
		}
	});

	function showHelp() {
		write(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
		write(chalk.cyan.bold('  KFC Interactive Mode - Keyboard Shortcuts\n'));
		write(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
		write(chalk.yellow('  /') + '  - Enter filter mode (type pattern, press Enter)\n');
		write(chalk.yellow('  c') + '  - Clear filter\n');
		write(chalk.yellow('  i') + '  - Toggle case-insensitive matching\n');
		write(chalk.yellow('  v') + '  - Toggle invert match\n');
		write(chalk.yellow('  p') + '  - Toggle pause/resume log streaming\n');
		write(chalk.yellow('  +') + '  - Increase context lines\n');
		write(chalk.yellow('  -') + '  - Decrease context lines\n');
		write(chalk.yellow('  ?') + '  - Show this help\n');
		write(chalk.yellow('  q') + '  - Quit\n');
		write(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'));
	}

	function refilterAndDisplay(
		pattern: string,
		ignoreCase: boolean,
		invert: boolean,
		contextLines: number,
		beforeLines: number,
		afterLines: number
	) {
		// Clear screen
		write('\x1Bc');
		
		const filtered = filterLines(allLines.current, pattern, ignoreCase, invert, contextLines, beforeLines, afterLines);
		
		if (filtered.length === 0 && pattern) {
			write(chalk.yellow(`No matches found for pattern: ${pattern}\n\n`));
		} else {
			let lastIdx = -2;
			filtered.forEach(({ bufferedLine, isMatch, index }) => {
				// Add separator for gaps
				if (index - lastIdx > 1 && pattern) {
					write(chalk.gray('--\n'));
				}
				
				// Highlight matches in the line
				const highlightedLine = pattern && isMatch
					? highlightMatches(bufferedLine.line, pattern, ignoreCase)
					: bufferedLine.line;
				
				// Re-colorize the highlighted line
				const coloredLine = colorizeLogLine(highlightedLine);
				
				const prefix = isMatch && pattern ? chalk.red('> ') : '  ';
				write(`${prefix}${bufferedLine.podPrefix} ${coloredLine}\n`);
				lastIdx = index;
			});
		}
	}

	function filterLines(
		lines: BufferedLine[],
		pattern: string,
		ignoreCase: boolean,
		invert: boolean,
		contextLines: number,
		beforeLines: number,
		afterLines: number
	): Array<{ bufferedLine: BufferedLine; isMatch: boolean; index: number }> {
		if (!pattern) {
			return lines.map((line, idx) => ({ bufferedLine: line, isMatch: false, index: idx }));
		}

		try {
			const flags = ignoreCase ? 'i' : '';
			const regex = new RegExp(pattern, flags);
			const matchedIndices = new Set<number>();
			
			// Find matches
			lines.forEach((line, idx) => {
				const matches = regex.test(line.line);
				const isMatch = invert ? !matches : matches;
				if (isMatch) {
					matchedIndices.add(idx);
				}
			});

			// Calculate context (contextLines overrides beforeLines/afterLines)
			const before = contextLines > 0 ? contextLines : beforeLines;
			const after = contextLines > 0 ? contextLines : afterLines;

			// Add context
			const toShow = new Set<number>();
			matchedIndices.forEach(idx => {
				toShow.add(idx);
				// Add before context
				for (let i = Math.max(0, idx - before); i < idx; i++) {
					toShow.add(i);
				}
				// Add after context
				for (let i = idx + 1; i <= Math.min(lines.length - 1, idx + after); i++) {
					toShow.add(i);
				}
			});

			// Return filtered lines with match flag
			return Array.from(toShow)
				.sort((a, b) => a - b)
				.map(idx => ({
					bufferedLine: lines[idx],
					isMatch: matchedIndices.has(idx),
					index: idx,
				}));
		} catch {
			return lines.map((line, idx) => ({ bufferedLine: line, isMatch: false, index: idx }));
		}
	}

	function shouldShowLine(line: string, pattern: string, ignoreCase: boolean, invert: boolean): boolean {
		if (!pattern) return true;
		
		try {
			const flags = ignoreCase ? 'i' : '';
			const regex = new RegExp(pattern, flags);
			const matches = regex.test(line);
			return invert ? !matches : matches;
		} catch {
			return true;
		}
	}

	// Use refs to track current filter state for the log callback
	const currentFilter = useRef({
		pattern: grepPattern,
		ignoreCase: grepIgnoreCase,
		invert: grepInvert,
	});

	// Update refs when filter state changes
	useEffect(() => {
		currentFilter.current = {
			pattern: grepPattern,
			ignoreCase: grepIgnoreCase,
			invert: grepInvert,
		};
	}, [grepPattern, grepIgnoreCase, grepInvert]);

	useEffect(() => {
		let cancelled = false;

		async function startFollowing() {
			try {
				setStatus(`Following logs for ${deployment}...`);
				setIsConnected(true);

				await followLogs(
					deployment,
					namespace,
					context,
					tail,
					(logLine) => {
						if (!cancelled && !paused) {
							const podPrefix = `[${logLine.pod}/${logLine.container}]`;
							const coloredLine = colorizeLogLine(logLine.line);
							
							// Add to buffer
							allLines.current.push({
								podPrefix,
								line: logLine.line,
								coloredLine,
								timestamp: Date.now(),
							});

							// Trim buffer if too large
							if (allLines.current.length > maxBufferSize) {
								allLines.current = allLines.current.slice(-maxBufferSize);
							}

							// Use current filter state from ref
							const { pattern, ignoreCase, invert } = currentFilter.current;
							
							// Check if should display
							const isMatch = shouldShowLine(logLine.line, pattern, ignoreCase, invert);
							
							if (!pattern || isMatch) {
								// Highlight matches in real-time
								const highlightedLine = pattern && isMatch
									? highlightMatches(logLine.line, pattern, ignoreCase)
									: logLine.line;
								
								const finalColoredLine = colorizeLogLine(highlightedLine);
								const prefix = isMatch && pattern ? chalk.red('> ') : '';
								write(`${prefix}${podPrefix} ${finalColoredLine}\n`);
							}
						}
					},
					(error) => {
						if (!cancelled) {
							setIsConnected(false);
							if (retryCount < maxRetry) {
								setRetryCount(prev => prev + 1);
								setStatus(`Connection lost. Retrying (${retryCount + 1}/${maxRetry})...`);
								setTimeout(() => startFollowing(), 2000);
							} else {
								setStatus(`Failed after ${maxRetry} attempts: ${error.message}`);
								setTimeout(() => exit(), 3000);
							}
						}
					}
				);
			} catch (error) {
				if (!cancelled) {
					setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
					setTimeout(() => exit(new Error(String(error))), 3000);
				}
			}
		}

		startFollowing();

		return () => {
			cancelled = true;
		};
	}, [deployment, namespace, context, tail, retryCount, paused]);

	// Initialize screen with space for status bar
	const hasInitialized = useRef(false);
	useEffect(() => {
		if (!hasInitialized.current) {
			// Add some initial newlines to push logs down
			write('\n\n\n');
			hasInitialized.current = true;
		}
	}, []);

	// Build status info
	const contextInfo = context ? chalk.blue(`[${context}]`) : '';
	const namespaceInfo = chalk.yellow(`[${namespace}]`);
	const deploymentInfo = chalk.cyan(deployment);
	
	const filterInfo = grepPattern
		? ` | ${grepInvert ? 'NOT ' : ''}/${grepPattern}/${grepIgnoreCase ? 'i' : ''}${
				grepContext > 0 ? ` ±${grepContext}` : ''
		  }`
		: '';
	
	const pauseInfo = paused ? ' [PAUSED]' : '';
	const modeInfo = filterMode ? ' [FILTER MODE]' : '';
	const bufferInfo = ` (${allLines.current.length})`;

	return (
		<Box flexDirection="column">
			{/* Status bar */}
			<Box borderStyle="round" borderColor="cyan" paddingX={1}>
				<Text>
					<Text color={isConnected ? 'green' : 'gray'}>{isConnected ? '●' : '○'}</Text>
					{context && <Text color="blue"> [{context}]</Text>}
					<Text color="yellow"> [{namespace}]</Text>
					<Text color="cyan"> {deployment}</Text>
					<Text color="magenta">{filterInfo}</Text>
					<Text color="yellow">{pauseInfo}</Text>
					<Text color="yellow">{modeInfo}</Text>
					<Text dimColor>{bufferInfo}</Text>
				</Text>
			</Box>

			{/* Filter input bar */}
			{filterMode && (
				<Box borderStyle="single" borderColor="yellow" paddingX={1} marginTop={1}>
					<Text color="yellow">
						Filter: <Text color="white">{filterInput}</Text>
						<Text dimColor> (Enter to apply, Esc to cancel)</Text>
					</Text>
				</Box>
			)}

			{/* Help hint - only show when not filtering and connected */}
			{!filterMode && isConnected && (
				<Box marginTop={1}>
					<Text dimColor>
						Press <Text color="yellow">?</Text> for help, <Text color="yellow">/</Text> to filter, <Text color="yellow">q</Text> to quit
					</Text>
				</Box>
			)}

			{/* Loading indicator when connecting */}
			{!isConnected && (
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> Reconnecting...
					</Text>
				</Box>
			)}
		</Box>
	);
}
