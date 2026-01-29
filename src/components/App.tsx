import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { getDeployments, followLogs } from '../k8s/client.js';
import LogViewer from './LogViewer.js';

interface AppProps {
	deploymentName?: string;
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

type AppState = 'loading' | 'selecting' | 'following' | 'error';

export default function App({
	deploymentName,
	namespace,
	context,
	tail,
	maxRetry,
	grepPattern,
	grepAfter = 0,
	grepBefore = 0,
	grepContext = 0,
	grepIgnoreCase = false,
	grepInvert = false,
}: AppProps) {
	const [state, setState] = useState<AppState>('loading');
	const [deployments, setDeployments] = useState<string[]>([]);
	const [selectedDeployment, setSelectedDeployment] = useState<string | undefined>(deploymentName);
	const [error, setError] = useState<string | null>(null);

	// Load deployments if no deployment name provided
	useEffect(() => {
		if (deploymentName) {
			setState('following');
			setSelectedDeployment(deploymentName);
		} else {
			loadDeployments();
		}
	}, []);

	async function loadDeployments() {
		try {
			setState('loading');
			const deps = await getDeployments(namespace, context);
			
			if (deps.length === 0) {
				setError(`No deployments found in namespace "${namespace}"`);
				setState('error');
				return;
			}

			if (deps.length === 1) {
				// Only one deployment, use it directly
				setSelectedDeployment(deps[0]);
				setState('following');
			} else {
				// Multiple deployments, show selector
				setDeployments(deps);
				setState('selecting');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setState('error');
		}
	}

	function handleSelect(item: { value: string }) {
		setSelectedDeployment(item.value);
		setState('following');
	}

	if (state === 'loading') {
		return (
			<Box>
				<Text color="cyan">
					<Spinner type="dots" /> Loading deployments from namespace "{namespace}"...
				</Text>
			</Box>
		);
	}

	if (state === 'error') {
		return (
			<Box flexDirection="column">
				<Text color="red">✗ Error: {error}</Text>
			</Box>
		);
	}

	if (state === 'selecting') {
		const items = deployments.map(dep => ({
			label: dep,
			value: dep,
		}));

		return (
			<Box flexDirection="column">
				<Text color="cyan">Select deployment:</Text>
				<SelectInput items={items} onSelect={handleSelect} />
			</Box>
		);
	}

	if (state === 'following' && selectedDeployment) {
		return (
			<LogViewer
				deployment={selectedDeployment}
				namespace={namespace}
				context={context}
				tail={tail}
				maxRetry={maxRetry}
				grepPattern={grepPattern}
				grepAfter={grepAfter}
				grepBefore={grepBefore}
				grepContext={grepContext}
				grepIgnoreCase={grepIgnoreCase}
				grepInvert={grepInvert}
			/>
		);
	}

	return null;
}
