import { useState } from 'react'

export interface LogDisplayState {
  filterMode: boolean
  paused: boolean
  isWrap: boolean
  isShowingHelp: boolean
  setFilterMode: (mode: boolean) => void
  setPaused: (paused: boolean) => void
  setIsWrap: (isWrap: boolean) => void
  setIsShowingHelp: (isShowingHelp: boolean) => void
}

export function useLogDisplayState(): LogDisplayState {
  const [filterMode, setFilterMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [isWrap, setIsWrap] = useState(true)
  const [isShowingHelp, setIsShowingHelp] = useState(false)

  return {
    filterMode,
    paused,
    isWrap,
    isShowingHelp,
    setFilterMode,
    setPaused,
    setIsWrap,
    setIsShowingHelp,
  }
}
