import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { getDeployments, getContexts, getNamespaces, getCurrentContext } from '../k8s/client.js';
import LogViewer from './LogViewer.js';
import { getCachedDeployments, setCachedDeployments } from '../utils/cache.js';
export default function App({ deploymentName: initialDeployment, namespace: initialNamespace, context: initialContext, tail, maxRetry, timeout, grepPattern, grepAfter = 0, grepBefore = 0, grepContext = 0, grepIgnoreCase = false, grepInvert = false, }) {
    const { exit } = useApp();
    const { stdout } = useStdout();
    // Navigation State
    const [layer, setLayer] = useState('context');
    const [selectedContext, setSelectedContext] = useState(initialContext || '');
    const [selectedNamespace, setSelectedNamespace] = useState(initialNamespace || 'default');
    const [selectedDeployment, setSelectedDeployment] = useState(initialDeployment || '');
    // Data selection state
    const [isSelectingNamespace, setIsSelectingNamespace] = useState(false);
    const [searchText, setSearchText] = useState('');
    // Data Cache / State
    const [contexts, setContexts] = useState([]);
    const [namespaces, setNamespaces] = useState([]);
    const [deployments, setDeployments] = useState([]);
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Initialization logic
    useEffect(() => {
        async function init() {
            if (initialDeployment) {
                // If deployment is specified, jump straight to logs
                // We assume context and namespace are provided or defaults are fine
                // But we might need to resolve context if not provided? 
                // The CLI args provide context/namespace directly.
                if (initialContext)
                    setSelectedContext(initialContext);
                // namespace is 'default' by default prop if not set, so it's fine.
                setLayer('logs');
            }
            else if (initialContext) {
                // If only context is provided, jump to deployment selection
                setSelectedContext(initialContext);
                setLayer('deployment');
            }
            else {
                // Otherwise start at context selection
                // But we need to load contexts first
                loadContexts();
            }
        }
        init();
    }, []);
    // Clear search text when changing layers or mode
    useEffect(() => {
        setSearchText('');
    }, [layer, isSelectingNamespace]);
    // Loaders
    async function loadContexts() {
        try {
            setIsLoading(true);
            setError(null);
            const ctxs = getContexts();
            setContexts(ctxs);
            // If no context selected yet, try to set current
            if (!selectedContext) {
                try {
                    const current = getCurrentContext();
                    // We don't auto-select in the UI list (SelectInput doesn't support 'default' index easily without finding it)
                    // But we can perhaps highlight it if we find the index.
                    // For now, simple list.
                }
                catch (e) { }
            }
        }
        catch (err) {
            setError(`Failed to load contexts: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function loadNamespaces() {
        try {
            setIsLoading(true);
            setError(null);
            const nss = await getNamespaces(selectedContext || undefined);
            setNamespaces(nss);
        }
        catch (err) {
            setError(`Failed to load namespaces: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setIsLoading(false);
        }
    }
    // Effects when entering layers
    useEffect(() => {
        if (layer === 'deployment') {
            let active = true;
            const ctx = selectedContext || getCurrentContext();
            const ns = selectedNamespace;
            // 1. Try Cache
            const cached = getCachedDeployments(ctx, ns);
            if (cached && cached.length > 0) {
                setDeployments(cached);
                // We have data, so we don't necessarily need to show 'Loading...' 
                // but we are syncing in background.
                // If we want to show strict 'syncing' status we'd need another state.
                // For now, let's keep isLoading false so user can interact immediately.
                setIsLoading(false);
            }
            else {
                setIsLoading(true);
                setDeployments([]);
            }
            setError(null);
            // 2. Background Sync
            (async () => {
                try {
                    const deps = await getDeployments(ns, selectedContext || undefined);
                    if (active) {
                        setCachedDeployments(ctx, ns, deps);
                        setDeployments(deps);
                        setIsLoading(false);
                        if (deps.length === 0) {
                            setError(`No deployments found in namespace "${ns}"`);
                        }
                    }
                }
                catch (err) {
                    if (active) {
                        // Only show error if we have no deployments (i.e. no cache or cache empty)
                        // If we have cache, we might want to swallow the error or show it unobtrusively?
                        // But existing error UI blocks the list.
                        // So if we have cache, we probably shouldn't set global 'error' that hides the list.
                        if (deployments.length === 0 && (!cached || cached.length === 0)) {
                            setError(`Failed to load deployments: ${err instanceof Error ? err.message : String(err)}`);
                        }
                        setIsLoading(false);
                    }
                }
            })();
            return () => { active = false; };
        }
    }, [layer, selectedContext, selectedNamespace]);
    useEffect(() => {
        if (isSelectingNamespace) {
            loadNamespaces();
        }
    }, [isSelectingNamespace]);
    // Input Handling for Navigation (Global-ish)
    // We use global input only for ESC when not in specific input modes?
    // Actually, SelectInput consumes input.
    // But we can add a listener that handles 'escape'.
    // Note: distinct useInput hooks might conflict if all active. 
    // We should only enable our nav handler when NOT in LogViewer (LogViewer handles its own input).
    useInput((input, key) => {
        // LogViewer handles its own input (including safeExit/q) inside the component
        if (layer === 'logs')
            return;
        if (key.escape) {
            if (isSelectingNamespace) {
                setIsSelectingNamespace(false);
                return;
            }
            // Clear search text if present
            if (searchText) {
                setSearchText('');
                return;
            }
            if (layer === 'deployment') {
                setLayer('context');
                loadContexts(); // Ensure contexts are loaded
                return;
            }
            if (layer === 'context') {
                exit();
                return;
            }
        }
        if (layer === 'deployment' && !isSelectingNamespace && (key.ctrl && input === 'n')) {
            // Switch namespace
            setIsSelectingNamespace(true);
            return;
        }
        // Search Input Handling
        // Only capture if not navigating (arrow keys, enter, esc, tab) and not control keys
        if ((layer === 'context' || layer === 'deployment') && !isSelectingNamespace) {
            // Handle Deletion
            if (key.delete || key.backspace) {
                if (key.meta) {
                    // Option+Delete / Meta+Backspace: Remove last word
                    setSearchText(prev => {
                        const words = prev.trimEnd().split(' ');
                        words.pop();
                        return words.join(' ') + (words.length > 0 ? ' ' : '');
                    });
                    return;
                }
                // Standard backspace
                setSearchText(prev => prev.slice(0, -1));
                return;
            }
            // Clear Line (Ctrl+U or Cmd+Delete mapped to ^U)
            if (key.ctrl && input === 'u') {
                setSearchText('');
                return;
            }
            // Alternative Clear (Ctrl+Backspace if supported)
            if (key.ctrl && (key.delete || key.backspace)) {
                setSearchText('');
                return;
            }
            if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.return && !key.escape && !key.tab) {
                setSearchText(prev => prev + input);
            }
        }
    }, { isActive: layer !== 'logs' });
    // Handlers
    const handleContextSelect = (item) => {
        setSelectedContext(item.value);
        setLayer('deployment');
    };
    const handleDeploymentSelect = (item) => {
        setSelectedDeployment(item.value);
        setLayer('logs');
    };
    const handleNamespaceSelect = (item) => {
        setSelectedNamespace(item.value);
        setIsSelectingNamespace(false);
        // Effect will trigger reload of deployments
    };
    // --- Render Helpers ---
    // Calculate limit for SelectInput
    const height = stdout?.rows || 20;
    // Accounting for header, search bar, footer
    const listLimit = Math.max(5, height - 7);
    // Context Selection View
    if (layer === 'context') {
        if (isLoading)
            return React.createElement(Text, { color: "green" },
                React.createElement(Spinner, { type: "dots" }),
                " Loading contexts...");
        if (error)
            return React.createElement(Text, { color: "red" },
                "Error: ",
                error);
        const filteredContexts = contexts.filter(c => c.toLowerCase().includes(searchText.toLowerCase()));
        const items = filteredContexts.map(c => ({ label: c, value: c }));
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { borderStyle: "round", borderColor: "blue", paddingX: 1 },
                React.createElement(Text, null, "Select Kubernetes Context (Cluster)")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, null,
                    "Search: ",
                    React.createElement(Text, { color: "yellow" }, searchText),
                    searchText ? '_' : '')),
            React.createElement(SelectInput, { items: items, onSelect: handleContextSelect, limit: listLimit }),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true },
                    "Press ",
                    React.createElement(Text, { color: "yellow" }, "Enter"),
                    " to select, ",
                    React.createElement(Text, { color: "yellow" }, "Esc"),
                    " to exit"))));
    }
    // Deployment Selection View
    if (layer === 'deployment') {
        if (isSelectingNamespace) {
            // Namespace Switcher Overlay
            if (isLoading)
                return React.createElement(Text, { color: "green" },
                    React.createElement(Spinner, { type: "dots" }),
                    " Loading namespaces...");
            if (error)
                return React.createElement(Box, { flexDirection: "column" },
                    React.createElement(Text, { color: "red" },
                        "Error: ",
                        error),
                    React.createElement(Text, { dimColor: true }, "Press Esc to cancel"));
            const items = namespaces.map(ns => ({ label: ns, value: ns }));
            // Try to find default index? Ink SelectInput doesn't support initialIndex easily by value.
            // Users just have to scroll.
            return (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { borderStyle: "double", borderColor: "yellow", paddingX: 1 },
                    React.createElement(Text, null, "Select Namespace")),
                React.createElement(SelectInput, { items: items, onSelect: handleNamespaceSelect, limit: listLimit }),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { dimColor: true },
                        "Press ",
                        React.createElement(Text, { color: "yellow" }, "Esc"),
                        " to cancel"))));
        }
        const filteredDeployments = deployments.filter(d => d.toLowerCase().includes(searchText.toLowerCase()));
        const items = filteredDeployments.map(d => ({ label: d, value: d }));
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { borderStyle: "round", borderColor: "cyan", paddingX: 1, flexDirection: "row", justifyContent: "space-between" },
                React.createElement(Text, null,
                    "Context: ",
                    React.createElement(Text, { color: "blue" }, selectedContext || 'current'),
                    " | Namespace: ",
                    React.createElement(Text, { color: "yellow" }, selectedNamespace))),
            isLoading ? (React.createElement(Text, null,
                React.createElement(Spinner, { type: "dots" }),
                " Loading deployments...")) : error ? (React.createElement(Text, { color: "red" },
                "Error: ",
                error)) : (React.createElement(Box, { flexDirection: "column" },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, null,
                        "Search: ",
                        React.createElement(Text, { color: "yellow" }, searchText),
                        searchText ? '_' : '')),
                React.createElement(SelectInput, { items: items, onSelect: handleDeploymentSelect, limit: listLimit }))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { dimColor: true },
                    React.createElement(Text, { color: "yellow" }, "Enter"),
                    " select deployment  |",
                    React.createElement(Text, { color: "yellow" }, " Ctrl+N"),
                    " switch namespace  |",
                    React.createElement(Text, { color: "yellow" }, " Esc"),
                    " back"))));
    }
    // Log Viewer View
    if (layer === 'logs') {
        // LogViewer handles its own "q" to exit.
        // BUT we want "ESC" to go back to deployment layer.
        // LogViewer actually calls exit() on 'q'.
        // We might need to Modify LogViewer to take an `onBack` prop?
        // User said: "In each layer... press esc to go back".
        // IF I'm in LogViewer, ESC should go back to Deployment selection.
        // Currently LogViewer's 'q' calls exit().
        // I should ideally modify LogViewer to accept an `onExit` or `onBack` callback instead of calling `exit()` hard.
        // Or I can wrap LogViewer.
        // If I pass a custom key handler to LogViewer?
        // LogViewer is complex.
        // The user request applies to the whole app.
        // "In every layer press esc to go back".
        // Let's modify LogViewer slightly to accept `onBack` prop.
        // If `onBack` is provided, 'q' (or strict ESC?) should call it.
        // User said "Press ESC to go back".
        // LogViewer currently: 'q' to quit.
        // I should add ESC handling in LogViewer to call onBack.
        return (React.createElement(LogViewer, { deployment: selectedDeployment, namespace: selectedNamespace, context: selectedContext, tail: tail, maxRetry: maxRetry, timeout: timeout, grepPattern: grepPattern, grepAfter: grepAfter, grepBefore: grepBefore, grepContext: grepContext, grepIgnoreCase: grepIgnoreCase, grepInvert: grepInvert, onBack: () => setLayer('deployment') }));
    }
    return null;
}
//# sourceMappingURL=App.js.map