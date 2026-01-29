import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';
// Helper function to add timeout to promises
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`)), timeoutMs)),
    ]);
}
export function getContexts() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    return kc.contexts.map(ctx => ctx.name);
}
export function getCurrentContext() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    return kc.currentContext;
}
export async function getNamespaces(context, timeoutMs = 5000) {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (context) {
        kc.setCurrentContext(context);
    }
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    try {
        const response = await withTimeout(coreApi.listNamespace(), timeoutMs, `listing namespaces${context ? ` (context: ${context})` : ''}`);
        return response.items.map((item) => item.metadata?.name || '').filter(Boolean);
    }
    catch (error) {
        throw new Error(`Failed to list namespaces: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function getDeployments(namespace, context, timeoutMs = 15000) {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (context) {
        kc.setCurrentContext(context);
    }
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);
    try {
        const response = await withTimeout(appsApi.listNamespacedDeployment({ namespace }), timeoutMs, `listing deployments in namespace "${namespace}"${context ? ` (context: ${context})` : ''}`);
        return response.items.map((item) => item.metadata?.name || '').filter(Boolean);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('timed out')) {
            throw new Error(`Connection timeout: Unable to connect to cluster${context ? ` "${context}"` : ''}. Please check your network connection and cluster availability.`);
        }
        throw new Error(`Failed to list deployments: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export async function followLogs(deployment, namespace, context, tailLines, onLog, onError, onProgress, timeoutMs = 10000) {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    if (context) {
        kc.setCurrentContext(context);
    }
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);
    try {
        // Get deployment
        onProgress?.('Fetching deployment info...');
        let deploymentResponse;
        try {
            deploymentResponse = await withTimeout(appsApi.readNamespacedDeployment({ name: deployment, namespace }), timeoutMs, `reading deployment "${deployment}"`);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('timed out')) {
                throw new Error(`Connection timeout: Unable to connect to cluster${context ? ` "${context}"` : ''}. Please check your network connection and cluster availability.`);
            }
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
        onProgress?.('Finding pods...');
        const podsResponse = await withTimeout(coreApi.listNamespacedPod({
            namespace,
            labelSelector,
        }), timeoutMs, `listing pods for deployment "${deployment}"`);
        if (podsResponse.items.length === 0) {
            throw new Error(`No pods found for deployment "${deployment}". The deployment may have 0 replicas.`);
        }
        // Follow logs from the first running pod
        const pod = podsResponse.items.find((p) => p.status?.phase === 'Running');
        if (!pod || !pod.metadata?.name) {
            throw new Error('No running pods found');
        }
        const podName = pod.metadata.name;
        const containerName = pod.spec?.containers[0]?.name || '';
        // Create log stream
        onProgress?.(`Connecting to pod ${podName}...`);
        const logStream = new k8s.Log(kc);
        const stream = new Writable({
            write(chunk, encoding, callback) {
                const lines = chunk.toString().split('\n').filter(Boolean);
                lines.forEach((line) => {
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
            await logStream.log(namespace, podName, containerName, stream, {
                follow: true,
                tailLines,
                pretty: false,
                timestamps: false,
            });
        }
        catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
    catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
    }
}
//# sourceMappingURL=client.js.map