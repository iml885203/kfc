import React from 'react';
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
export default function LogViewer({ deployment, namespace, context, tail, maxRetry, timeout, grepPattern: initialPattern, grepAfter: initialAfter, grepBefore: initialBefore, grepContext: initialContext, grepIgnoreCase: initialIgnoreCase, grepInvert: initialInvert, onBack, }: LogViewerProps): React.JSX.Element;
export {};
