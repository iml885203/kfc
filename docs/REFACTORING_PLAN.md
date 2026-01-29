# KFC 代碼重構與清理計劃

## 📋 重構建議

### 1. **LogViewer.tsx 需要拆分** (優先級：高)

**問題：**

- 單一文件 431 行，包含太多職責
- 過濾邏輯、UI 渲染、日誌處理混在一起
- 難以測試和維護

**建議拆分：**

```
src/
├── components/
│   ├── LogViewer.tsx          # 主組件 (簡化到 ~150 行)
│   ├── StatusBar.tsx          # 狀態列組件
│   └── FilterInput.tsx        # 過濾輸入組件
├── hooks/
│   ├── useLogFilter.ts        # 過濾邏輯 Hook
│   ├── useLogBuffer.ts        # 日誌緩衝 Hook
│   └── useKeyboardShortcuts.ts # 鍵盤快捷鍵 Hook
└── utils/
    ├── colorize.ts            # 已存在
    ├── logFilter.ts           # 過濾邏輯函數
    └── logHighlight.ts        # 高亮邏輯函數
```

**具體拆分：**

#### `src/hooks/useLogFilter.ts`

```typescript
// 管理過濾狀態和邏輯
export function useLogFilter(initialPattern, initialOptions) {
  const [pattern, setPattern] = useState(initialPattern);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [invert, setInvert] = useState(false);
  const [context, setContext] = useState(0);

  const toggleIgnoreCase = () => setIgnoreCase(!ignoreCase);
  const toggleInvert = () => setInvert(!invert);
  const increaseContext = () => setContext(Math.min(context + 1, 20));
  const decreaseContext = () => setContext(Math.max(context - 1, 0));

  return { pattern, setPattern, ignoreCase, invert, context, ... };
}
```

#### `src/hooks/useLogBuffer.ts`

```typescript
// 管理日誌緩衝
export function useLogBuffer(maxSize = 10000) {
  const buffer = useRef<BufferedLine[]>([]);

  const addLine = (line: BufferedLine) => {
    buffer.current.push(line);
    if (buffer.current.length > maxSize) {
      buffer.current = buffer.current.slice(-maxSize);
    }
  };

  const clear = () => {
    buffer.current = [];
  };

  return { buffer, addLine, clear };
}
```

#### `src/utils/logFilter.ts`

```typescript
// 純函數：過濾邏輯
export function filterLines(lines, pattern, options) { ... }
export function shouldShowLine(line, pattern, options) { ... }
export function getContextLines(lines, matchIndices, before, after) { ... }
```

#### `src/utils/logHighlight.ts`

```typescript
// 純函數：高亮邏輯
export function highlightMatches(text, pattern, ignoreCase) { ... }
```

#### `src/components/StatusBar.tsx`

```typescript
// 狀態列組件
export function StatusBar({
  isConnected,
  context,
  namespace,
  deployment,
  filterInfo,
  bufferSize
}) {
  return <Box>...</Box>;
}
```

---

### 2. **配置文件清理** (優先級：中)

**過時文件：**

- `.kfc.conf.example` - 舊的 shell 配置格式
- `.kfc.yaml.example` - 可能不再使用

**建議：**

- 確認是否還需要這些配置文件
- 如果 TypeScript 版本不需要配置文件，可以刪除
- 或者更新為 TypeScript 版本的配置範例

---

### 3. **文檔整合** (優先級：中)

**當前文檔：**

- `README.md` - 主文檔
- `README_TS.md` - TypeScript 版本文檔
- `FINAL_SUMMARY.md` - 完成總結
- `CHECKLIST.md` - 檢查清單
- `COLOR_OUTPUT.md` - 顏色輸出說明
- `INTERACTIVE_MODE.md` - 互動模式說明
- `KUBERNETES_SETUP.md` - K8s 設置

**建議整合：**

```
README.md                    # 主文檔（保留）
├── docs/
│   ├── INTERACTIVE_MODE.md  # 互動模式（保留）
│   ├── COLOR_OUTPUT.md      # 顏色輸出（保留）
│   └── KUBERNETES_SETUP.md  # K8s 設置（保留）
└── archive/                 # 歸檔
    ├── README_TS.md         # 移到歸檔
    ├── FINAL_SUMMARY.md     # 移到歸檔
    └── CHECKLIST.md         # 移到歸檔或刪除
```

---

### 4. **空目錄清理** (優先級：低)

**空目錄：**

- `scripts/` - 空目錄，可以刪除或添加有用的腳本

**建議：**

- 刪除空的 `scripts/` 目錄
- 或者添加有用的腳本（例如：部署腳本、測試腳本）

---

### 5. **bin 目錄清理** (優先級：低)

**當前：**

- `bin/kfc` - 主入口
- `bin/kfc.js` - 可能是舊的或重複的

**建議：**

- 確認 `bin/kfc.js` 是否還需要
- 如果不需要，從 `.gitignore` 和倉庫中移除

---

## 🎯 重構優先順序

### Phase 1: 立即執行（高優先級）

1. ✅ 拆分 `LogViewer.tsx` 的過濾邏輯到 `utils/logFilter.ts`
2. ✅ 拆分高亮邏輯到 `utils/logHighlight.ts`
3. ✅ 創建 `hooks/useLogFilter.ts`
4. ✅ 創建 `hooks/useLogBuffer.ts`

### Phase 2: 短期執行（中優先級）

5. 拆分 UI 組件（StatusBar, FilterInput）
6. 清理過時的配置文件
7. 整合文檔結構

### Phase 3: 長期優化（低優先級）

8. 添加單元測試
9. 添加 E2E 測試
10. 性能優化（虛擬滾動等）

---

## 📝 重構後的好處

### 可測試性

- 純函數可以輕鬆單元測試
- Hooks 可以獨立測試
- 組件職責單一，易於測試

### 可維護性

- 代碼組織清晰
- 職責分離明確
- 易於理解和修改

### 可重用性

- Hooks 可以在其他組件中重用
- 工具函數可以在其他項目中重用

### 性能

- 更細粒度的重新渲染控制
- 更好的 memoization 機會

---

## 🚀 執行計劃

**建議先執行 Phase 1 的重構：**

1. 創建新的 `hooks/` 和 `utils/` 目錄
2. 逐步遷移邏輯
3. 保持功能不變
4. 測試確保無回歸

**是否要開始執行 Phase 1 的重構？**
