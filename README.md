# KFC (Kubernetes Follow Colorful)

<img src="assets/logo.png" width="200" alt="KFC Logo">

A beautiful CLI tool for following Kubernetes deployment logs with rich syntax highlighting and interactive filtering.

![Version](https://img.shields.io/badge/version-0.1.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen)

---

## ✨ Features

- 🎨 **Rich Syntax Highlighting** - Colorized log levels, JSON, timestamps, URLs, IPs
- 🔄 **Auto-Reconnect** - Automatically reconnects when connection is lost
- 🎯 **Interactive Selection** - Beautiful deployment selector when no deployment specified
- ⌨️ **Interactive Filtering** - Real-time log filtering with keyboard shortcuts
- 🔴 **Error Collection Mode** - Automatically collect and view errors, copy to clipboard
- 📋 **Quick Copy** - Copy error logs with context to clipboard instantly
- 📊 **Real-time Status** - Live connection status indicator with error counter
- 🌍 **Cross-platform** - Works on Windows, macOS, and Linux
- 📦 **Zero Config** - Works out of the box with kubectl

---

## 🚀 Quick Start

### Using npx (Recommended)

```bash
npx kfctl -n production my-deployment
```

### Global Installation

```bash
npm install -g @logan/kfc
kfctl --help
```

---

## 📖 Usage

### Basic Usage

```bash
# Follow logs for a specific deployment
kfctl my-deployment

# Specify namespace
kfctl -n production my-deployment

# Specify context and namespace
kfctl -c staging-cluster -n production my-deployment

# Filter logs with grep
kfctl -n production -g "ERROR" my-deployment

# Show context lines around matches
kfctl -n production -g "ERROR" -C 3 my-deployment
```

### Interactive Selector

```bash
# Without deployment name, shows interactive selector
kfctl -n production
```

### Command Line Options

```bash
Options:
  --namespace, -n    Kubernetes namespace (default: default)
  --context, -c      Kubernetes context
  --tail             Number of lines to show (default: 100)
  --max-retry        Maximum retry attempts (default: 10)
  --grep, -g         Filter logs by pattern (regex supported)
  --after, -A        Show N lines after match
  --before, -B       Show N lines before match
  --context, -C      Show N lines before and after match
  --ignore-case, -i  Case-insensitive matching
  --invert, -v       Invert match (show non-matching lines)
  --init-error-detector  Create custom error detector template file
  --help, -h         Show help
```

### Keyboard Shortcuts

Press `?` in interactive mode to see all shortcuts. Key features:
- `e` - Error mode (auto-collect errors, copy with y/Y)
- `/` - Filter logs
- `p` - Pause/resume

### Custom Error Detection

Customize error detection to match your log format:

```bash
# Create configuration template
kfctl --init-error-detector

# Edit ~/.kfctl/errorDetector.json
# KFC will automatically use your configuration
```

Supports JSON configuration (recommended) or JavaScript files. See [docs/ERROR_DETECTION.md](docs/ERROR_DETECTION.md) for details.

---

## 🐛 Troubleshooting

### Deployment Not Found
```bash
# Check namespace
kubectl get deployments -n <namespace>
kfctl -n <namespace> <deployment>
```

### Cannot Connect to Kubernetes
```bash
# Verify kubectl configuration
kubectl config current-context
kubectl get pods

# Specify context explicitly
kfctl -c <context> -n <namespace> <deployment>
```

---

## 📝 License

MIT

---

**Enjoy beautiful Kubernetes logs!** 🚀
