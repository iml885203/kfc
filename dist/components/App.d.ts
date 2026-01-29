import React from 'react';
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
export default function App({ deploymentName: initialDeployment, namespace: initialNamespace, context: initialContext, tail, maxRetry, timeout, grepPattern, grepAfter, grepBefore, grepContext, grepIgnoreCase, grepInvert, }: AppProps): React.JSX.Element | null;
export {};
