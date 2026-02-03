import { useState } from 'react'

export interface LogDisplayState {
  filterMode: boolean
  paused: boolean
  isWrap: boolean
  isShowingHelp: boolean
  showPodPrefix: boolean
  setFilterMode: (mode: boolean) => void
  setPaused: (paused: boolean) => void
  setIsWrap: (isWrap: boolean) => void
  setIsShowingHelp: (isShowingHelp: boolean) => void
  setShowPodPrefix: (showPodPrefix: boolean) => void
}

export function useLogDisplayState(): LogDisplayState {
  const [filterMode, setFilterMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [isWrap, setIsWrap] = useState(true)
  const [isShowingHelp, setIsShowingHelp] = useState(false)
  const [showPodPrefix, setShowPodPrefix] = useState(false) // Default to false - hide pod prefix

  return {
    filterMode,
    paused,
    isWrap,
    isShowingHelp,
    showPodPrefix,
    setFilterMode,
    setPaused,
    setIsWrap,
    setIsShowingHelp,
    setShowPodPrefix,
  }
}
