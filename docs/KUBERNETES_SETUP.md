# Kubernetes Setup Guide

## KubeConfig Setup

### Download from Rancher
1. Login to Rancher
2. User Menu (top-right) > Download KubeConfig
3. Edit your existing config file:
```bash
# Backup existing config
cp ~/.kube/config ~/.kube/config.backup

# Edit config file to add new settings
vim ~/.kube/config
```

### Switch Context
```bash
# List available contexts
kubectl config get-contexts

# Switch context
kubectl config use-context <context-name>
```

Tip: We recommend using kubectx for easier context switching:
```bash
brew install kubectx
kubectx  # List and select context
```

---

# Kubernetes 環境設定指南

## 設定 KubeConfig

### 從 Rancher 下載
1. 登入 Rancher
2. 右上角使用者選單 > Download KubeConfig
3. 編輯現有的 config 檔案：
```bash
# 備份現有設定
cp ~/.kube/config ~/.kube/config.backup

# 編輯 config 檔案，將新的設定加入
vim ~/.kube/config
```

### 切換 Context
```bash
# 列出可用的 contexts
kubectl config get-contexts

# 切換 context
kubectl config use-context <context-name>
```

提示：推薦使用 kubectx 來更方便地切換 context：
```bash
brew install kubectx
kubectx  # 列出並選擇 context
```
