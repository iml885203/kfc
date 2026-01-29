import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';

export interface LogLine {
	pod: string;
	container: string;
	line: string;
	timestamp?: Date;
}

export async function getDeployments(
	namespace: string,
	context?: string
): Promise<string[]> {
	const kc = new k8s.KubeConfig();
	kc.loadFromDefault();

	if (context) {
		kc.setCurrentContext(context);
	}

	const appsApi = kc.makeApiClient(k8s.AppsV1Api);

	try {
		const response = await appsApi.listNamespacedDeployment({ namespace });
		return response.items.map((item: k8s.V1Deployment) => item.metadata?.name || '').filter(Boolean);
	} catch (error) {
		throw new Error(`Failed to list deployments: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export async function followLogs(
	deployment: string,
	namespace: string,
	context: string | undefined,
	tailLines: number,
	onLog: (log: LogLine) => void,
	onError: (error: Error) => void
): Promise<void> {
	const kc = new k8s.KubeConfig();
	kc.loadFromDefault();

	if (context) {
		kc.setCurrentContext(context);
	}

	const coreApi = kc.makeApiClient(k8s.CoreV1Api);
	const appsApi = kc.makeApiClient(k8s.AppsV1Api);

	try {
		// Get deployment
		let deploymentResponse;
		try {
			deploymentResponse = await appsApi.readNamespacedDeployment({ name: deployment, namespace });
		} catch (error: any) {
			if (error.response?.statusCode === 404) {
				throw new Error(`Deployment "${deployment}" not found in namespace "${namespace}". Use 'kubectl get deployments -n ${namespace}' to list available deployments.`);
			}
			throw error;
		}
		
		const selector = deploymentResponse.spec?.selector?.matchLabels;

		if (!selector) {
			throw new Error('Deployment has no selector labels');
		}

		// Convert selector to label selector string
		const labelSelector = Object.entries(selector)
			.map(([key, value]) => `${key}=${value}`)
			.join(',');

		// Get pods
		const podsResponse = await coreApi.listNamespacedPod({
			namespace,
			labelSelector,
		});

		if (podsResponse.items.length === 0) {
			throw new Error(`No pods found for deployment "${deployment}". The deployment may have 0 replicas.`);
		}

		// Follow logs from the first running pod
		const pod = podsResponse.items.find((p: k8s.V1Pod) => p.status?.phase === 'Running');
		
		if (!pod || !pod.metadata?.name) {
			throw new Error('No running pods found');
		}

		const podName = pod.metadata.name;
		const containerName = pod.spec?.containers[0]?.name || '';

		// Create log stream
		const logStream = new k8s.Log(kc);
		
		const stream = new Writable({
			write(chunk: Buffer, encoding: string, callback: () => void) {
				const lines = chunk.toString().split('\n').filter(Boolean);
				lines.forEach((line: string) => {
					onLog({
						pod: podName,
						container: containerName,
						line,
						timestamp: new Date(),
					});
				});
				callback();
			},
		});

		try {
			await logStream.log(
				namespace,
				podName,
				containerName,
				stream,
				{
					follow: true,
					tailLines,
					pretty: false,
					timestamps: false,
				}
			);
		} catch (error) {
			onError(error instanceof Error ? error : new Error(String(error)));
		}
	} catch (error) {
		onError(error instanceof Error ? error : new Error(String(error)));
	}
}
