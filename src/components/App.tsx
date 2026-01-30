
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { getDeployments, getContexts, getNamespaces, getCurrentContext } from '../k8s/client.js';
import LogViewer from './LogViewer.js';
import { getCachedDeployments, setCachedDeployments } from '../utils/cache.js';
import { getDefaultNamespace, setDefaultNamespace } from '../utils/config.js';

interface AppProps {
	deploymentName?: string;
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
}

type Layer = 'context' | 'deployment' | 'logs';

export default function App({
	deploymentName: initialDeployment,
	namespace: initialNamespace,
	context: initialContext,
	tail,
	maxRetry,
	timeout,
	grepPattern,
	grepAfter = 0,
	grepBefore = 0,
	grepContext = 0,
	grepIgnoreCase = false,
	grepInvert = false,
}: AppProps) {
	const { exit } = useApp();
	const { stdout } = useStdout();


	
	// Navigation State
	const [layer, setLayer] = useState<Layer>('context');
	const [selectedContext, setSelectedContext] = useState<string>(initialContext || '');
	const [selectedNamespace, setSelectedNamespace] = useState<string>(initialNamespace || 'default');
	const [selectedDeployment, setSelectedDeployment] = useState<string>(initialDeployment || '');

	// Data selection state
	const [isSelectingNamespace, setIsSelectingNamespace] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [highlightedNamespace, setHighlightedNamespace] = useState<string>('');
	const [message, setMessage] = useState<string | null>(null);

	// Data Cache / State
	const [contexts, setContexts] = useState<string[]>([]);
	const [namespaces, setNamespaces] = useState<string[]>([]);
	const [deployments, setDeployments] = useState<string[]>([]);
	
	// UI State
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Initialization logic
	useEffect(() => {
		async function init() {
			if (initialDeployment) {
				if (initialContext) setSelectedContext(initialContext);
				setLayer('logs');
			} else if (initialContext) {
				setSelectedContext(initialContext);
				setLayer('deployment');
			} else {
				loadContexts();
			}

			// Check for default namespace preference
			if (!initialDeployment && initialNamespace === 'default') {
				const pref = getDefaultNamespace();
				if (pref && pref !== 'default') {
					try {
						const ctx = initialContext || getCurrentContext();
						// Fetch namespaces to verify existence
						// Note: This might delay startup slightly or run in parallel?
						// We run it optimistically.
						const nss = await getNamespaces(ctx);
						if (nss.includes(pref)) {
							setSelectedNamespace(pref);
						}
					} catch (e) {
						// Ignore error, fallback to default
					}
				}
			}
		}
		init();
	}, []);

	// Clear search text when changing layers or mode
	useEffect(() => {
		setSearchText('');
		setMessage(null);
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
				} catch (e) {}
			}
		} catch (err) {
			setError(`Failed to load contexts: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setIsLoading(false);
		}
	}

	async function loadNamespaces() {
		try {
			setIsLoading(true);
			setError(null);
			const nss = await getNamespaces(selectedContext || undefined);
			setNamespaces(nss);
		} catch (err) {
			setError(`Failed to load namespaces: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
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
			} else {
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
				} catch (err) {
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
		if (layer === 'logs') return;

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

		// Ensure we always have a valid highlighted namespace for Ctrl+S
		// This handles the case where searching update the list but 'onHighlight' hasn't fired yet
		if (key.ctrl && input === 's' && isSelectingNamespace) {
			const target = highlightedNamespace || (filteredNamespaces.length > 0 ? filteredNamespaces[0] : '');
			if (target) {
				setDefaultNamespace(target);
				setMessage(`Default namespace set to '${target}'`);
				setTimeout(() => setMessage(null), 3000);
			}
			return;
		}

		// Search Input Handling
		// Only capture if not navigating (arrow keys, enter, esc, tab) and not control keys
		if ((layer === 'context' || layer === 'deployment')) {
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
	const handleContextSelect = (item: { value: string }) => {
		setSelectedContext(item.value);
		setLayer('deployment');
	};


	const handleDeploymentSelect = (item: { value: string }) => {
		setSelectedDeployment(item.value);
		setLayer('logs');
	};

	const handleNamespaceSelect = (item: { value: string }) => {
		setSelectedNamespace(item.value);
		setIsSelectingNamespace(false);
		// Effect will trigger reload of deployments
	};

	// --- Helpers ---
	const filteredNamespaces = useMemo(() => {
		if (!isSelectingNamespace) return [];
		return namespaces.filter(ns => ns.toLowerCase().includes(searchText.toLowerCase()));
	}, [namespaces, searchText, isSelectingNamespace]);

	// Sync highlighted namespace when filtered list changes (e.g. searching)
	useEffect(() => {
		if (isSelectingNamespace && filteredNamespaces.length > 0) {
			// SelectInput resets to index 0 on items change, so we should track that
			setHighlightedNamespace(filteredNamespaces[0]);
		}
	}, [filteredNamespaces, isSelectingNamespace]);

	// --- Render Helpers ---

	// Calculate limit for SelectInput
	const height = stdout?.rows || 20;
	// Accounting for header, search bar, footer
	const listLimit = Math.max(5, height - 7);

	// Context Selection View
	if (layer === 'context') {
		if (isLoading) return <Text color="green"><Spinner type="dots"/> Loading contexts...</Text>;
		if (error) return <Text color="red">Error: {error}</Text>;

		const filteredContexts = contexts.filter(c => c.toLowerCase().includes(searchText.toLowerCase()));
		const items = filteredContexts.map(c => ({ label: c, value: c }));
		
		return (
			<Box flexDirection="column">
				<Box borderStyle="round" borderColor="blue" paddingX={1}>
					<Text>Select Kubernetes Context (Cluster)</Text>
				</Box>
				<Box marginBottom={1}>
					<Text>Search: <Text color="yellow">{searchText}</Text>{searchText ? '_' : ''}</Text>
				</Box>
				<SelectInput items={items} onSelect={handleContextSelect} limit={listLimit} />
				<Box marginTop={1}>
					<Text dimColor>Press <Text color="yellow">Enter</Text> to select, <Text color="yellow">Esc</Text> to exit</Text>
				</Box>
			</Box>
		);
	}

	// Deployment Selection View
	if (layer === 'deployment') {
		if (isSelectingNamespace) {
			// Namespace Switcher Overlay
			if (isLoading) return <Text color="green"><Spinner type="dots"/> Loading namespaces...</Text>;
			if (error) return <Box flexDirection="column"><Text color="red">Error: {error}</Text><Text dimColor>Press Esc to cancel</Text></Box>;

			const items = filteredNamespaces.map(ns => ({ label: ns, value: ns }));

			return (
				<Box flexDirection="column">
					<Box borderStyle="double" borderColor="yellow" paddingX={1}>
						<Text>Select Namespace</Text>
					</Box>
					<Box marginBottom={1}>
						<Text>Search: <Text color="yellow">{searchText}</Text>{searchText ? '_' : ''}</Text>
					</Box>
					{message && <Text color="green" bold>{message}</Text>}
					<SelectInput 
						items={items} 
						onSelect={handleNamespaceSelect} 
						onHighlight={(item) => setHighlightedNamespace(item.value)}
						limit={listLimit} 
					/>
					<Box marginTop={1}>
						<Text dimColor>
							<Text color="yellow">Enter</Text> select  |  
							<Text color="yellow"> Ctrl+S</Text> set default  |  
							<Text color="yellow"> Esc</Text> cancel
						</Text>
					</Box>
				</Box>
			);
		}

		const filteredDeployments = deployments.filter(d => d.toLowerCase().includes(searchText.toLowerCase()));
		const items = filteredDeployments.map(d => ({ label: d, value: d }));

		return (
			<Box flexDirection="column">
				<Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="row" justifyContent="space-between">
					<Text>Context: <Text color="blue">{selectedContext || 'current'}</Text> | Namespace: <Text color="yellow">{selectedNamespace}</Text></Text>
				</Box>
				
				{isLoading ? (
					<Text><Spinner type="dots"/> Loading deployments...</Text>
				) : error ? (
					<Text color="red">Error: {error}</Text>
				) : (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text>Search: <Text color="yellow">{searchText}</Text>{searchText ? '_' : ''}</Text>
						</Box>
						<SelectInput items={items} onSelect={handleDeploymentSelect} limit={listLimit} />
					</Box>
				)}

				<Box marginTop={1}>
					<Text dimColor>
						<Text color="yellow">Enter</Text> select deployment  |  
						<Text color="yellow"> Ctrl+N</Text> switch namespace  |  
						<Text color="yellow"> Esc</Text> back
					</Text>
				</Box>
			</Box>
		);
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
		
		return (
			<LogViewer
				deployment={selectedDeployment}
				namespace={selectedNamespace}
				context={selectedContext}
				tail={tail}
				maxRetry={maxRetry}
				timeout={timeout}
				grepPattern={grepPattern}
				grepAfter={grepAfter}
				grepBefore={grepBefore}
				grepContext={grepContext}
				grepIgnoreCase={grepIgnoreCase}
				grepInvert={grepInvert}
				onBack={() => setLayer('deployment')}
			/>
		);
	}

	return null;
}

