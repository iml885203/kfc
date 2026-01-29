/**
 * Hook for managing log buffer
 */
import { useRef, useCallback } from 'react';
export function useLogBuffer(maxSize = 10000) {
    const buffer = useRef([]);
    const addLine = useCallback((line) => {
        buffer.current.push(line);
        // Trim buffer if too large
        if (buffer.current.length > maxSize) {
            buffer.current = buffer.current.slice(-maxSize);
        }
    }, [maxSize]);
    const clear = useCallback(() => {
        buffer.current = [];
    }, []);
    const getSize = useCallback(() => {
        return buffer.current.length;
    }, []);
    return {
        buffer,
        addLine,
        clear,
        getSize,
    };
}
//# sourceMappingURL=useLogBuffer.js.map