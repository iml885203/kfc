/**
 * Hook for managing log buffer
 */
export interface BufferedLine {
    podPrefix: string;
    line: string;
    coloredLine: string;
    timestamp: number;
}
export interface UseLogBufferReturn {
    buffer: React.MutableRefObject<BufferedLine[]>;
    addLine: (line: BufferedLine) => void;
    clear: () => void;
    getSize: () => number;
}
export declare function useLogBuffer(maxSize?: number): UseLogBufferReturn;
