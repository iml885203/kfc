import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useStdout, useInput } from 'ink';
import Spinner from 'ink-spinner';
import chalk from 'chalk';
import { followLogs } from '../k8s/client.js';
import { colorizeLogLine } from '../utils/colorize.js';
import { useLogBuffer } from '../hooks/useLogBuffer.js';
import { useLogFilter } from '../hooks/useLogFilter.js';
import { filterLines, shouldShowLine } from '../utils/logFilter.js';
import { highlightMatches } from '../utils/logHighlight.js';



interface LogViewerProps {
	deployment: string;
	namespace: string;
	context?: string;
	tail: number;
	maxRetry: number;
	timeout: number;
	grepPattern?: string;
	grepAfter?: number;
	grepBefore?: number;
	grepContext?: number;
	grepIgnoreCase?: boolean;
	grepInvert?: boolean;
	onBack?: () => void;
}

export default function LogViewer({
	deployment,
	namespace,
	context,
	tail,
	maxRetry,
	timeout,
	grepPattern: initialPattern,
	grepAfter: initialAfter = 0,
	grepBefore: initialBefore = 0,
	grepContext: initialContext = 0,
	grepIgnoreCase: initialIgnoreCase = false,
	grepInvert: initialInvert = false,
	onBack,
}: LogViewerProps) {
	const { exit } = useApp();
	const { write } = useStdout();


	
	// Connection state
	const [status, setStatus] = useState<string>('Connecting...');
	const [connectionProgress, setConnectionProgress] = useState<string>('');
	const [retryCount, setRetryCount] = useState(0);
	const [isConnected, setIsConnected] = useState(false);
	
	// Use custom hooks for buffer and filter management
	const { buffer, addLine, clear } = useLogBuffer(10000);
	const filter = useLogFilter(
		initialPattern,
		initialAfter,
		initialBefore,
		initialContext,
		initialIgnoreCase,
		initialInvert
	);
	
	// Interactive state
	const [filterMode, setFilterMode] = useState(false);
	const [filterInput, setFilterInput] = useState('');
	const [paused, setPaused] = useState(false);
	const [isWrap, setIsWrap] = useState(true);
	
	// Track current filter state for the log callback (to avoid closure staleness)
	const currentFilter = useRef(filter);
	useEffect(() => {
		currentFilter.current = filter;
		// Re-filter when filter settings change
		refilterAndDisplay();
	}, [filter]);

	// Initialize screen with space for status bar
	const hasInitialized = useRef(false);
	useEffect(() => {
		if (!hasInitialized.current) {
			write('\n\n\n');
			hasInitialized.current = true;
		}
		// Restore wrap on exit
		return () => {
			write('\x1B[?7h');
		};
	}, []);

	// Handle wrap toggling
	useEffect(() => {
		write(isWrap ? '\x1B[?7h' : '\x1B[?7l');
		if (isConnected) {
			refilterAndDisplay();
		}
	}, [isWrap]);

	// Function to clear screen and display filtered logs
	function refilterAndDisplay() {
		// Clear screen
		write('\x1Bc');
		
		const { pattern, ignoreCase, invert, context, before, after } = currentFilter.current;
		
		const filtered = filterLines(
			buffer.current,
			pattern,
			ignoreCase,
			invert,
			context,
			before,
			after
		);
		
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
				const podPart = bufferedLine.podPrefix ? `${bufferedLine.podPrefix} ` : '';
				write(`${prefix}${podPart}${coloredLine}\n`);
				lastIdx = index;
			});
		}
	}

	// Track if help is showing
	const [isShowingHelp, setIsShowingHelp] = useState(false);
	const isShowingHelpRef = useRef(false);

	// Sync state to ref for callback access
	useEffect(() => {
		isShowingHelpRef.current = isShowingHelp;
		if (isShowingHelp) {
			write('\x1Bc');
		} else {
			// Restore logs when closing help
			if (isConnected) {
				refilterAndDisplay();
			}
		}
	}, [isShowingHelp, isConnected]);

	// Handle keyboard input
	useInput((input, key) => {
		if (isShowingHelp) {
			// Any key exits help
			setIsShowingHelp(false);
			return;
		}

		if (!isConnected) {
			return;
		}
		
		if (filterMode) {
			// In filter mode, handle text input
			if (key.return) {
				// Apply filter
				filter.setPattern(filterInput);
				setFilterMode(false);
			} else if (key.escape) {
				// Cancel filter
				setFilterMode(false);
				setFilterInput('');
			} else if (key.backspace || key.delete) {
				if (key.meta) {
					// Option+Delete: Remove last word
					setFilterInput(prev => {
						const words = prev.trimEnd().split(' ');
						words.pop();
						return words.join(' ') + (words.length > 0 ? ' ' : '');
					});
					return;
				}
				
				if (key.ctrl) {
					// Ctrl+Backspace
					setFilterInput('');
					return;
				}

				setFilterInput(prev => prev.slice(0, -1));
			} else if (key.ctrl && input === 'u') {
				// Ctrl+U (Cmd+Delete often sends this)
				setFilterInput('');
			} else if (!key.ctrl && !key.meta && input) {
				setFilterInput(prev => prev + input);
			}
		} else {
			// Normal mode - keyboard shortcuts
			if (input === '/') {
				// Enter filter mode
				setFilterMode(true);
				setFilterInput(filter.pattern);
			} else if (input === 'c') {
				// Clear filter
				filter.clearFilter();
			} else if (input === 'i') {
				// Toggle ignore case
				filter.toggleIgnoreCase();
			} else if (input === 'v') {
				// Toggle invert
				filter.toggleInvert();
			} else if (input === 'p') {
				// Toggle pause
				setPaused(prev => !prev);
			} else if (input === '+') {
				// Increase context
				filter.increaseContext();
			} else if (input === '-') {
				// Decrease context
				filter.decreaseContext();
			} else if (input === '?') {
				setIsShowingHelp(true);
			} else if (key.escape && onBack) {
				onBack();
			} else if (input === 'x' || (key.ctrl && input === 'l')) {
				// Clear logs
				clear();
				refilterAndDisplay();
			} else if (input === 'm') {
				// Mark separator
				const separator = chalk.dim('----------------------------------------------------------------');
				const markLine = {
					podPrefix: '',
					line: '',
					coloredLine: separator,
					timestamp: Date.now(),
				};
				addLine(markLine);
				if (!paused) {
					write(`  ${separator}\n`);
				}
			} else if (input === 'w') {
				// Toggle wrap
				setIsWrap(prev => !prev);
			}
		}
	}, { isActive: true });

	// Connection state check for non-exit keys
	useEffect(() => {
		if (!isConnected && filterMode) {
			setFilterMode(false);
		}
	}, [isConnected]);

	// Main log streaming effect
	useEffect(() => {
		let cancelled = false;

		async function startFollowing() {
			try {
				setStatus(`Connecting to ${deployment}...`);
				setConnectionProgress('Initializing...');
				setIsConnected(false);

				await followLogs(
					deployment,
					namespace,
					context,
					tail,
					(logLine) => {
						if (!cancelled && !paused) {
							// Mark as connected on first log
							if (!isConnected) {
								setIsConnected(true);
								setStatus(`Following logs for ${deployment}`);
								setConnectionProgress('');
							}
							
							const podPrefix = `[${logLine.pod}/${logLine.container}]`;
							const coloredLine = colorizeLogLine(logLine.line);
							
							const bufferedLine = {
								podPrefix,
								line: logLine.line,
								coloredLine,
								timestamp: Date.now(),
							};

							// Add to buffer
							addLine(bufferedLine);


							// Use current filter state from ref
							const { pattern, ignoreCase, invert } = currentFilter.current;
							
							// Check if should display using utils
							// shouldShowLine is now safe against invalid regex (returns true)
							const isMatch = shouldShowLine(logLine.line, pattern, ignoreCase, invert);
							
							if ((!pattern || isMatch) && !isShowingHelpRef.current) {
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
							setConnectionProgress('');
							if (retryCount < maxRetry) {
								setRetryCount(prev => prev + 1);
								const nextRetry = retryCount + 1;
								setStatus(`Connection lost. Retrying (${nextRetry}/${maxRetry})...`);
								setTimeout(() => startFollowing(), 2000);
							} else {
								setStatus(`Failed after ${maxRetry} attempts: ${error.message}`);
								write(chalk.red(`\n✗ Error: ${error.message}\n`));
								setTimeout(() => exit(), 3000);
							}
						}
					},
					(progressMsg) => {
						setConnectionProgress(progressMsg);
					},
					timeout * 1000
				);
			} catch (error) {
				if (!cancelled) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					setStatus(`Error: ${errorMsg}`);
					setConnectionProgress('');
					write(chalk.red(`\n✗ ${errorMsg}\n`));
					setTimeout(() => exit(new Error(String(error))), 3000);
				}
			}
		}

		startFollowing();

		return () => {
			cancelled = true;
		};
	}, [deployment, namespace, context, tail, retryCount, paused]);

	// Build status info
	const contextInfo = context ? chalk.blue(`[${context}]`) : '';
	const namespaceInfo = chalk.yellow(`[${namespace}]`);
	const deploymentInfo = chalk.cyan(deployment);
	
	const filterInfo = filter.pattern
		? ` | ${filter.invert ? 'NOT ' : ''}/${filter.pattern}/${filter.ignoreCase ? 'i' : ''}${
				filter.context > 0 ? ` ±${filter.context}` : ''
		  }`
		: '';
	
	const pauseInfo = paused ? ' [PAUSED]' : '';
	const modeInfo = filterMode ? ' [FILTER MODE]' : '';
	const wrapInfo = !isWrap ? ' [NO WRAP]' : '';
	const bufferInfo = ` (${buffer.current.length})`;

	if (isShowingHelp) {
		return (
			<Box flexDirection="column" padding={1} borderStyle="double" borderColor="cyan">
				<Text bold color="cyan" underline>KFC Interactive Mode - Keyboard Shortcuts</Text>
				<Box marginTop={1} flexDirection="column">
					<Text><Text color="yellow" bold>/</Text>   Filter logs (type pattern, press Enter)</Text>
					<Text><Text color="yellow" bold>c</Text>   Clear filter</Text>
					<Text><Text color="yellow" bold>i</Text>   Toggle case-insensitive matching</Text>
					<Text><Text color="yellow" bold>v</Text>   Toggle invert match</Text>
					<Text><Text color="yellow" bold>p</Text>   Toggle pause/resume log streaming</Text>
					<Text><Text color="yellow" bold>+</Text>   Increase context lines</Text>
					<Text><Text color="yellow" bold>-</Text>   Decrease context lines</Text>
					<Text><Text color="yellow" bold>x</Text>   Clear logs (or Ctrl+L)</Text>
					<Text><Text color="yellow" bold>m</Text>   Add mark separator (----)</Text>
					<Text><Text color="yellow" bold>w</Text>   Toggle text wrapping</Text>
					<Text><Text color="yellow" bold>?</Text>   Show this help</Text>
					<Text><Text color="yellow" bold>Esc</Text> Go back</Text>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>Press any key to return...</Text>
				</Box>
			</Box>
		);
	}

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
					<Text color="red">{wrapInfo}</Text>
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
						Press <Text color="yellow">?</Text> for help, <Text color="yellow">/</Text> to filter
					</Text>
				</Box>
			)}

			{/* Loading indicator when connecting */}
			{!isConnected && (
				<Box marginTop={1}>
					<Text color="yellow">
						<Spinner type="dots" /> {connectionProgress || 'Connecting...'}
						{retryCount > 0 && ` (Retry ${retryCount}/${maxRetry})`}
					</Text>
				</Box>
			)}
		</Box>
	);
}
