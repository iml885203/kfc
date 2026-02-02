import { useEffect, useRef, useState } from 'react'
import { followLogs as defaultFollowLogs } from '../k8s/client.js'
import { colorizeLogLine } from '../utils/colorize.js'

export interface LogLine {
  podPrefix: string
  line: string
  coloredLine: string
  timestamp: number
}

interface UseLogStreamProps {
  deployment: string
  namespace: string
  context?: string
  tail: number
  maxRetry: number
  timeout: number
  paused: boolean
  followLogs?: typeof defaultFollowLogs
  addLine: (line: LogLine) => void
  addErrorLogLine: (line: string, coloredLine: string, pod: string, container: string) => void
}

export function useLogStream({
  deployment,
  namespace,
  context,
  tail,
  maxRetry,
  timeout,
  paused,
  followLogs = defaultFollowLogs,
  addLine,
  addErrorLogLine,
}: UseLogStreamProps) {
  const [status, setStatus] = useState<string>('Connecting...')
  const [connectionProgress, setConnectionProgress] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [errorString, setErrorString] = useState<string | null>(null) // For fatal errors

  // Refs to avoid stale closures in callbacks
  const isConnectedRef = useRef(isConnected)
  const addErrorLogLineRef = useRef(addErrorLogLine)
  const addLineRef = useRef(addLine)
  const retryCountRef = useRef(retryCount)
  const pausedRef = useRef(paused)

  useEffect(() => {
    isConnectedRef.current = isConnected
    addErrorLogLineRef.current = addErrorLogLine
    addLineRef.current = addLine
    retryCountRef.current = retryCount
    pausedRef.current = paused
  }, [isConnected, addErrorLogLine, addLine, retryCount, paused])

  useEffect(() => {
    let cancelled = false
    let retryTimer: NodeJS.Timeout | null = null

    async function startFollowing() {
      try {
        setStatus(`Connecting to ${deployment}...`)
        setConnectionProgress('Initializing...')
        setIsConnected(false)

        await followLogs(
          deployment,
          namespace,
          context,
          tail,
          (logLine) => {
            if (!cancelled && !pausedRef.current) {
              // Mark as connected on first log
              if (!isConnectedRef.current) {
                setIsConnected(true)
                setStatus(`Following logs for ${deployment}`)
                setConnectionProgress('')
              }

              // Guard against undefined/null log lines
              if (!logLine.line || typeof logLine.line !== 'string') {
                return
              }

              const podPrefix = `[${logLine.pod}/${logLine.container}]`
              const coloredLine = colorizeLogLine(logLine.line)

              const bufferedLine = {
                podPrefix,
                line: logLine.line,
                coloredLine,
                timestamp: Date.now(),
              }

              // Add to buffer
              addLineRef.current(bufferedLine)

              // CRITICAL: Add to error collection
              addErrorLogLineRef.current(logLine.line, coloredLine, logLine.pod, logLine.container)
            }
          },
          (error) => {
            if (!cancelled) {
              setIsConnected(false)
              setConnectionProgress('')
              if (retryCountRef.current < maxRetry) {
                const nextRetry = retryCountRef.current + 1
                setRetryCount(nextRetry)
                setStatus(`Connection lost. Retrying (${nextRetry}/${maxRetry})...`)
                // Schedule retry
                retryTimer = setTimeout(() => {
                  if (!cancelled) {
                    startFollowing()
                  }
                }, 2000)
              }
              else {
                setStatus(`Failed after ${maxRetry} attempts: ${error.message}`)
                setErrorString(error.message)
              }
            }
          },
          (progressMsg) => {
            setConnectionProgress(progressMsg)
          },
          timeout * 1000,
        )
      }
      catch (error) {
        if (!cancelled) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          setStatus(`Error: ${errorMsg}`)
          setConnectionProgress('')
          setErrorString(errorMsg)
        }
      }
    }

    startFollowing()

    return () => {
      cancelled = true
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [deployment, namespace, context, tail, maxRetry, timeout, followLogs])

  return {
    status,
    connectionProgress,
    retryCount,
    isConnected,
    errorString,
  }
}
