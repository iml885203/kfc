# 📦 Release 指南

本專案使用 **GitHub Actions + OIDC Trusted Publishing** 自動發布到 npm。

---

## 🚀 發布新版本

### 1. 確保代碼已提交

```bash
git status  # 確認沒有未提交的更改
```

### 2. 升級版本號

```bash
# Patch 版本 (0.1.8 → 0.1.9) - 小修復
npm version patch

# Minor 版本 (0.1.8 → 0.2.0) - 新功能
npm version minor

# Major 版本 (0.1.8 → 1.0.0) - 重大變更
npm version major
```

這會自動：
- ✅ 更新 `package.json` 的版本號
- ✅ 創建 git commit
- ✅ 創建 git tag

### 3. 推送到 GitHub

```bash
git push && git push --tags
```

### 4. 創建 GitHub Release

```bash
# 使用 gh CLI (推薦)
gh release create v0.1.9 \
  --title "v0.1.9 - 簡短描述" \
  --notes "
## 🎯 新功能
- 功能 1
- 功能 2

## 🐛 修復
- 修復 1
- 修復 2
"
```

或手動在 GitHub 網站創建：
- 訪問 https://github.com/iml885203/kfc/releases/new
- 選擇剛才推送的 tag
- 填寫 release notes
- 點擊 "Publish release"

### 5. 自動發布到 npm

**無需手動操作！** GitHub Actions 會自動：

1. ✅ 檢測到新 release
2. ✅ 觸發 `publish.yml` workflow
3. ✅ 編譯專案
4. ✅ 使用 OIDC 認證
5. ✅ 發布到 npm
6. ✅ 生成 provenance attestation

查看執行狀態：https://github.com/iml885203/kfc/actions

---

## 🔍 驗證發布

### 檢查 npm

```bash
# 查看最新版本
npm view kfctl version

# 查看完整資訊
npm view kfctl

# 測試安裝
npx kfctl@latest --version
```

### 檢查 GitHub

- Releases: https://github.com/iml885203/kfc/releases
- Actions: https://github.com/iml885203/kfc/actions

---

## 📋 完整流程範例

```bash
# 1. 確保在 master 分支且代碼已提交
git checkout master
git pull
git status

# 2. 升級版本 (例如：patch)
npm version patch

# 3. 推送
git push && git push --tags

# 4. 創建 release
gh release create v0.1.9 \
  --title "v0.1.9 - Bug fixes and improvements" \
  --notes "Fix interactive mode keyboard shortcuts"

# 5. 等待 GitHub Actions 完成 (約 30 秒)
# 6. 驗證
npm view kfctl version
npx kfctl@latest --version
```

---

## ⚙️ OIDC Trusted Publishing 設定

**已完成設定，無需重複！** 以下是記錄供參考：

### npm 端設定

1. 訪問 https://www.npmjs.com/package/kfctl/access
2. 在 "Trusted Publisher" 區域添加：
   - Provider: **GitHub**
   - Organization/User: **iml885203**
   - Repository: **kfc**
   - Workflow: **publish.yml**
   - Environment: (留空)

### GitHub Actions 配置

- Workflow 文件：`.github/workflows/publish.yml`
- Node.js 版本：**24** (需要 npm 11+ for OIDC)
- 權限：`id-token: write`
- 無需 `NPM_TOKEN` secret

---

## 🐛 常見問題

### Q: 發布失敗了怎麼辦？

1. 檢查 GitHub Actions logs: https://github.com/iml885203/kfc/actions
2. 確認 npm Trusted Publisher 設定正確
3. 確認 `package.json` 有 `repository` 欄位

### Q: 如何撤回已發布的版本？

```bash
# 從 npm 撤回 (24 小時內)
npm unpublish kfctl@0.1.9

# 或標記為 deprecated
npm deprecate kfctl@0.1.9 "This version has issues, please use 0.1.10"
```

### Q: 可以手動發布嗎？

可以，但不推薦：

```bash
npm login
npm publish --access public
```

---

## 📚 參考資源

- [npm Trusted Publishing 文檔](https://docs.npmjs.com/trusted-publishers/)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [semantic-release](https://github.com/semantic-release/semantic-release) (進階自動化工具)

---

**享受自動化發布！** 🚀
