export interface LogLine {
    pod: string;
    container: string;
    line: string;
    timestamp?: Date;
}
export declare function getContexts(): string[];
export declare function getCurrentContext(): string;
export declare function getNamespaces(context?: string, timeoutMs?: number): Promise<string[]>;
export declare function getDeployments(namespace: string, context?: string, timeoutMs?: number): Promise<string[]>;
export declare function followLogs(deployment: string, namespace: string, context: string | undefined, tailLines: number, onLog: (log: LogLine) => void, onError: (error: Error) => void, onProgress?: (message: string) => void, timeoutMs?: number): Promise<void>;
