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
export default function LogViewer({ deployment, namespace, context, tail, maxRetry, timeout, grepPattern: initialPattern, grepAfter: initialAfter = 0, grepBefore: initialBefore = 0, grepContext: initialContext = 0, grepIgnoreCase: initialIgnoreCase = false, grepInvert: initialInvert = false, onBack, }) {
    const { exit } = useApp();
    const { write } = useStdout();
    // Connection state
    const [status, setStatus] = useState('Connecting...');
    const [connectionProgress, setConnectionProgress] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    // Use custom hooks for buffer and filter management
    const { buffer, addLine } = useLogBuffer(10000);
    const filter = useLogFilter(initialPattern, initialAfter, initialBefore, initialContext, initialIgnoreCase, initialInvert);
    // Interactive state
    const [filterMode, setFilterMode] = useState(false);
    const [filterInput, setFilterInput] = useState('');
    const [paused, setPaused] = useState(false);
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
    }, []);
    // Function to clear screen and display filtered logs
    function refilterAndDisplay() {
        // Clear screen
        write('\x1Bc');
        const { pattern, ignoreCase, invert, context, before, after } = currentFilter.current;
        const filtered = filterLines(buffer.current, pattern, ignoreCase, invert, context, before, after);
        if (filtered.length === 0 && pattern) {
            write(chalk.yellow(`No matches found for pattern: ${pattern}\n\n`));
        }
        else {
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
    // Track if help is showing
    const [isShowingHelp, setIsShowingHelp] = useState(false);
    const isShowingHelpRef = useRef(false);
    // Sync state to ref for callback access
    useEffect(() => {
        isShowingHelpRef.current = isShowingHelp;
        if (isShowingHelp) {
            write('\x1Bc');
        }
        else {
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
            }
            else if (key.escape) {
                // Cancel filter
                setFilterMode(false);
                setFilterInput('');
            }
            else if (key.backspace || key.delete) {
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
            }
            else if (key.ctrl && input === 'u') {
                // Ctrl+U (Cmd+Delete often sends this)
                setFilterInput('');
            }
            else if (!key.ctrl && !key.meta && input) {
                setFilterInput(prev => prev + input);
            }
        }
        else {
            // Normal mode - keyboard shortcuts
            if (input === '/') {
                // Enter filter mode
                setFilterMode(true);
                setFilterInput(filter.pattern);
            }
            else if (input === 'c') {
                // Clear filter
                filter.clearFilter();
            }
            else if (input === 'i') {
                // Toggle ignore case
                filter.toggleIgnoreCase();
            }
            else if (input === 'v') {
                // Toggle invert
                filter.toggleInvert();
            }
            else if (input === 'p') {
                // Toggle pause
                setPaused(prev => !prev);
            }
            else if (input === '+') {
                // Increase context
                filter.increaseContext();
            }
            else if (input === '-') {
                // Decrease context
                filter.decreaseContext();
            }
            else if (input === '?') {
                setIsShowingHelp(true);
            }
            else if (key.escape && onBack) {
                onBack();
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
                await followLogs(deployment, namespace, context, tail, (logLine) => {
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
                }, (error) => {
                    if (!cancelled) {
                        setIsConnected(false);
                        setConnectionProgress('');
                        if (retryCount < maxRetry) {
                            setRetryCount(prev => prev + 1);
                            const nextRetry = retryCount + 1;
                            setStatus(`Connection lost. Retrying (${nextRetry}/${maxRetry})...`);
                            setTimeout(() => startFollowing(), 2000);
                        }
                        else {
                            setStatus(`Failed after ${maxRetry} attempts: ${error.message}`);
                            write(chalk.red(`\n✗ Error: ${error.message}\n`));
                            setTimeout(() => exit(), 3000);
                        }
                    }
                }, (progressMsg) => {
                    setConnectionProgress(progressMsg);
                }, timeout * 1000);
            }
            catch (error) {
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
        ? ` | ${filter.invert ? 'NOT ' : ''}/${filter.pattern}/${filter.ignoreCase ? 'i' : ''}${filter.context > 0 ? ` ±${filter.context}` : ''}`
        : '';
    const pauseInfo = paused ? ' [PAUSED]' : '';
    const modeInfo = filterMode ? ' [FILTER MODE]' : '';
    const bufferInfo = ` (${buffer.current.length})`;
    if (isShowingHelp) {
        return (React.createElement(Box, { flexDirection: "column", padding: 1, borderStyle: "double", borderColor: "cyan" },
            React.createElement(Text, { bold: true, color: "cyan", underline: true }, "KFC Interactive Mode - Keyboard Shortcuts"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "/"),
                    "   Filter logs (type pattern, press Enter)"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "c"),
                    "   Clear filter"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "i"),
                    "   Toggle case-insensitive matching"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "v"),
                    "   Toggle invert match"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "p"),
                    "   Toggle pause/resume log streaming"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "+"),
                    "   Increase context lines"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "-"),
                    "   Decrease context lines"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "?"),
                    "   Show this help"),
                React.createElement(Text, null,
                    React.createElement(Text, { color: "yellow", bold: true }, "Esc"),
                    " Go back")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true }, "Press any key to return..."))));
    }
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { borderStyle: "round", borderColor: "cyan", paddingX: 1 },
            React.createElement(Text, null,
                React.createElement(Text, { color: isConnected ? 'green' : 'gray' }, isConnected ? '●' : '○'),
                context && React.createElement(Text, { color: "blue" },
                    " [",
                    context,
                    "]"),
                React.createElement(Text, { color: "yellow" },
                    " [",
                    namespace,
                    "]"),
                React.createElement(Text, { color: "cyan" },
                    " ",
                    deployment),
                React.createElement(Text, { color: "magenta" }, filterInfo),
                React.createElement(Text, { color: "yellow" }, pauseInfo),
                React.createElement(Text, { color: "yellow" }, modeInfo),
                React.createElement(Text, { dimColor: true }, bufferInfo))),
        filterMode && (React.createElement(Box, { borderStyle: "single", borderColor: "yellow", paddingX: 1, marginTop: 1 },
            React.createElement(Text, { color: "yellow" },
                "Filter: ",
                React.createElement(Text, { color: "white" }, filterInput),
                React.createElement(Text, { dimColor: true }, " (Enter to apply, Esc to cancel)")))),
        !filterMode && isConnected && (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { dimColor: true },
                "Press ",
                React.createElement(Text, { color: "yellow" }, "?"),
                " for help, ",
                React.createElement(Text, { color: "yellow" }, "/"),
                " to filter"))),
        !isConnected && (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "yellow" },
                React.createElement(Spinner, { type: "dots" }),
                " ",
                connectionProgress || 'Connecting...',
                retryCount > 0 && ` (Retry ${retryCount}/${maxRetry})`)))));
}
//# sourceMappingURL=LogViewer.js.map