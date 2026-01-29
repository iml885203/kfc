# 🎨 KFC 彩色輸出功能

## ✨ 新增強化的語法高亮

KFC 現在內建了類似 kubecolor 的豐富語法高亮功能！

---

## 🎯 支援的彩色元素

### **1. 日誌級別**

- 🔴 **ERROR/FATAL** - 紅色粗體（整行）
- 🟡 **WARN/WARNING** - 黃色（整行）
- 🟢 **INFO** - 綠色（整行）
- 🔵 **DEBUG** - 青色（整行）
- ⚪ **TRACE** - 白色（整行）

### **2. 時間戳記**

- 🔵 **ISO 8601 格式** - 藍色
  - `2026-01-29T13:00:00Z`
  - `2026-01-29 13:00:00+08:00`
  - `2026-01-29T13:00:00.123Z`

### **3. JSON 語法高亮**

- 🔵 **Keys** - 青色
  - `"timestamp"`, `"level"`, `"message"`
- 🟢 **字串值** - 綠色
  - `"Request processed"`, `"john.doe"`
- 🟣 **數字** - 紫色
  - `12345`, `150.5`, `-42`
- 🟡 **布林值** - 黃色
  - `true`, `false`
- ⚫ **null** - 灰色
  - `null`
- ⚪ **括號** - 白色
  - `{}`, `[]`

### **4. 一般語法元素**

- 🔵 **URL** - 藍色 + 底線
  - `https://api.example.com/v1/users`
  - `http://localhost:8080`
- 🟣 **IP 地址** - 紫色
  - `192.168.1.100`, `10.0.0.1`
- 🔵 **檔案路徑** - 青色
  - `/var/log/app/access.log`
  - `/app/main.go`
- 🟢 **引號字串** - 綠色
  - `"john.doe"`, `"user:12345"`
- 🟣 **數字** - 紫色
  - `12345`, `3.14`, `-100`
- 🟡 **布林值** - 黃色
  - `true`, `false`
- 🔵 **Key-Value 的 Key** - 青色
  - `username=`, `id:`, `debug=`

---

## 📝 範例

### **範例 1: 純文字日誌**

**輸入:**

```
2026-01-29T13:00:00Z INFO Starting application
2026-01-29T13:00:01Z DEBUG Connecting to database at 192.168.1.100:5432
2026-01-29T13:00:02Z WARN Cache miss for key="user:12345"
2026-01-29T13:00:03Z ERROR Failed to connect to https://api.example.com/v1/users
```

**輸出:**

- 時間戳記 `2026-01-29T13:00:00Z` - 🔵 藍色
- `INFO Starting application` - 🟢 綠色（整行）
- `DEBUG Connecting to database at 192.168.1.100:5432` - 🔵 青色（整行）
  - IP `192.168.1.100` - 🟣 紫色
- `WARN Cache miss for key="user:12345"` - 🟡 黃色（整行）
  - 字串 `"user:12345"` - 🟢 綠色
- `ERROR Failed to connect to https://api.example.com/v1/users` - 🔴 紅色粗體（整行）
  - URL `https://api.example.com/v1/users` - 🔵 藍色底線

### **範例 2: JSON 格式日誌**

**輸入:**

```json
{
  "timestamp": "2026-01-29T13:00:06Z",
  "level": "INFO",
  "message": "Request processed",
  "user_id": 12345,
  "success": true,
  "duration_ms": 150.5
}
```

**輸出:**

- `{` `}` - ⚪ 白色
- `"timestamp"` - 🔵 青色（key）
- `"2026-01-29T13:00:06Z"` - 🟢 綠色（字串值）
- `"level"` - 🔵 青色（key）
- `"INFO"` - 🟢 綠色（字串值）
- `"message"` - 🔵 青色（key）
- `"Request processed"` - 🟢 綠色（字串值）
- `"user_id"` - 🔵 青色（key）
- `12345` - 🟣 紫色（數字）
- `"success"` - 🔵 青色（key）
- `true` - 🟡 黃色（布林值）
- `"duration_ms"` - 🔵 青色（key）
- `150.5` - 🟣 紫色（數字）

### **範例 3: 結構化日誌**

**輸入:**

```
2026-01-29T13:00:08Z INFO Config loaded: debug=true timeout=30 max_connections=100
```

**輸出:**

- `2026-01-29T13:00:08Z` - 🔵 藍色（時間戳記）
- `INFO Config loaded:` - 🟢 綠色（整行，因為有 INFO）
- `debug` - 🔵 青色（key）
- `true` - 🟡 黃色（布林值）
- `timeout` - 🔵 青色（key）
- `30` - 🟣 紫色（數字）
- `max_connections` - 🔵 青色（key）
- `100` - 🟣 紫色（數字）

---

## 🆚 與 kubecolor 的比較

| 功能            | kubecolor       | KFC             |
| --------------- | --------------- | --------------- |
| 日誌級別著色    | ✅              | ✅              |
| JSON 語法高亮   | ✅              | ✅              |
| 時間戳記著色    | ✅              | ✅              |
| URL 高亮        | ✅              | ✅              |
| IP 地址高亮     | ✅              | ✅              |
| 檔案路徑高亮    | ✅              | ✅              |
| 數字/布林值著色 | ✅              | ✅              |
| Key-Value 著色  | ✅              | ✅              |
| **內建支援**    | ❌ 需要額外安裝 | ✅ **內建**     |
| **跨平台**      | ❌ 需要編譯     | ✅ **原生支援** |

---

## 🎨 顏色配置

目前顏色配置如下（未來可能支援自訂）：

```go
// 日誌級別
ERROR/FATAL  → 紅色粗體
WARN/WARNING → 黃色
INFO         → 綠色
DEBUG        → 青色
TRACE        → 白色

// 語法元素
Timestamp    → 藍色
JSON Key     → 青色
String       → 綠色
Number       → 紫色
Boolean      → 黃色
Null         → 灰色
Bracket      → 白色
URL          → 藍色底線
IP Address   → 紫色
File Path    → 青色
```

---

## 🔧 技術實現

### **智慧檢測**

1. **JSON 檢測**: 自動識別 JSON 格式並解析
2. **時間戳記檢測**: 使用正則表達式匹配 ISO 8601 格式
3. **日誌級別檢測**: 優先級最高，整行著色
4. **語法元素檢測**: 使用正則表達式匹配各種模式

### **避免重複著色**

使用範圍追蹤機制，確保每個字元只被著色一次：

```go
type coloredRange struct {
    start, end int
    colored    string
}
```

### **優先級順序**

1. 日誌級別（最高優先級，整行）
2. URL（高可見度）
3. 引號字串
4. IP 地址
5. 檔案路徑
6. 布林值
7. Null 值
8. 數字
9. Key-Value 的 Key

---

## 📊 效能

- **JSON 解析**: 僅在檢測到 JSON 格式時才解析
- **正則表達式**: 預編譯，高效匹配
- **範圍追蹤**: 避免重複處理
- **記憶體使用**: 最小化，逐行處理

---

## 🚀 使用方式

彩色輸出**自動啟用**，無需任何配置：

```bash
# 直接使用，自動彩色輸出
./kfc -n production my-deployment

# 所有日誌都會自動著色
kfc -n kube-system coredns
```

---

## 🎯 未來改進

### **計畫中的功能**

- [ ] 自訂顏色配置
- [ ] 支援更多日誌格式
- [ ] 正則表達式自訂高亮
- [ ] 主題支援（dark/light）
- [ ] 停用彩色輸出選項 (`--no-color`)

---

## 💡 提示

### **最佳體驗**

1. 使用支援 256 色的終端機
2. 使用深色背景（顏色對比更好）
3. 確保終端機支援 ANSI 顏色碼

### **故障排除**

如果顏色沒有顯示：

1. 檢查終端機是否支援顏色
2. 檢查 `TERM` 環境變數
3. 嘗試設置 `export TERM=xterm-256color`

---

## 📝 總結

✅ **內建豐富的語法高亮**  
✅ **類似 kubecolor 的功能**  
✅ **無需額外依賴**  
✅ **自動檢測和著色**  
✅ **支援 JSON、純文字、結構化日誌**

**享受更美觀的 Kubernetes 日誌體驗！** 🎨✨
