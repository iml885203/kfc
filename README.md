# KFC (Kubernetes Follow Colorful)

<img src="assets/logo.png" width="200" alt="KFC Logo">

A beautiful CLI tool for following Kubernetes deployment logs with rich syntax highlighting and interactive UI, built with **TypeScript + Ink**.

![Version](https://img.shields.io/badge/version-0.1.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen)

---

## ✨ Features

- 🎨 **Rich Syntax Highlighting** - JSON, strings, numbers, booleans, URLs, IPs, and more
- 🔄 **Auto-Reconnect** - Automatically reconnects when connection is lost
- 🎯 **Interactive Selection** - Beautiful Ink-powered deployment selector
- 📊 **Real-time Status** - Live connection status indicator
- 🚀 **Fast & Lightweight** - Built with TypeScript for performance
- 🎭 **React for CLI** - Powered by Ink (React for terminal)
- 🌍 **Cross-platform** - Works on Windows, macOS, and Linux
- 📦 **Zero Config** - Works out of the box with kubectl

---

## 🚀 Quick Start

### Using npx (Recommended)

```bash
npx kubefc -n production my-deployment
# or
pnpx kubefc -n production my-deployment
```

### Global Installation

```bash
pnpm install -g @logan/kfc
kfc --help
```

### From Source

```bash
git clone <repository_url>
cd kfc
pnpm install
pnpm run build
pnpm link --global
kfc --help
```

---

## 📖 Usage

### Basic Usage

```bash
# Follow logs for a specific deployment
kfc my-deployment

# Specify namespace
kfc -n production my-deployment

# Specify context and namespace
kfc -c staging-cluster -n production my-deployment

# Custom tail lines
kfc --tail 200 my-deployment

# Custom retry attempts
kfc --max-retry 5 my-deployment
```

### Interactive Mode

```bash
# Without deployment name, shows interactive selector
kfc -n production

# Output:
# Select deployment:
# ❯ app-deployment
#   api-deployment
#   worker-deployment
```

---

## 🎨 Syntax Highlighting

KFC provides rich syntax highlighting for various log formats:

### Log Levels

- 🔴 **ERROR/FATAL** - Red bold
- 🟡 **WARN/WARNING** - Yellow
- 🟢 **INFO** - Green
- 🔵 **DEBUG** - Cyan
- ⚪ **TRACE** - White

### Syntax Elements

- 🔵 **Timestamps** - Blue (ISO 8601)
- 🟢 **Strings** - Green (`"..."`)
- 🟣 **Numbers** - Magenta (`123`, `3.14`)
- 🟡 **Booleans** - Yellow (`true`, `false`)
- ⚫ **Null** - Gray (`null`)
- 🔵 **URLs** - Blue underlined
- 🟣 **IP Addresses** - Magenta
- 🔵 **File Paths** - Cyan

### JSON Support

```json
{
  "timestamp": "2026-01-29T13:00:00Z", // Cyan key, Green value
  "level": "INFO", // Cyan key, Green value
  "user_id": 12345, // Cyan key, Magenta number
  "success": true, // Cyan key, Yellow boolean
  "error": null // Cyan key, Gray null
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
export KFC_NAMESPACE=production    # Default namespace
export KFC_TAIL_LINES=200          # Default tail lines
export KFC_MAX_RETRY=5             # Default max retry attempts
```

### Command Line Options

```bash
kfc --help

Options:
  --namespace, -n  Kubernetes namespace (default: default)
  --context, -c    Kubernetes context
  --tail           Number of lines to show from the end (default: 100)
  --max-retry      Maximum retry attempts (default: 10)
  --grep, -g       Filter logs by pattern (regex supported)
  --after, -A      Show N lines after match (default: 0)
  --before, -B     Show N lines before match (default: 0)
  --context, -C    Show N lines before and after match (default: 0)
  --ignore-case, -i  Case-insensitive pattern matching
  --invert, -v     Invert match (show non-matching lines)
  --version, -v    Show version
  --help, -h       Show help
```

---

## 🛠️ Development

### Project Structure

```
kfc/
├── src/
│   ├── cli.tsx              # CLI entry point
│   ├── components/
│   │   ├── App.tsx          # Main app component
│   │   └── LogViewer.tsx    # Log viewer component
│   ├── k8s/
│   │   └── client.ts        # Kubernetes client
│   └── utils/
│       └── colorize.ts      # Colorization utilities
├── dist/                    # Compiled output
├── bin/kfc                  # CLI executable
├── package.json
└── tsconfig.json
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Development mode (with tsx)
pnpm run dev -- -n production my-deployment

# Build
pnpm run build

# Run built version
pnpm start -- --help

# Test
pnpm test
```

### Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Ink** - React for CLI
- **@kubernetes/client-node** - Official Kubernetes Node.js client
- **chalk** - Terminal colors
- **meow** - CLI argument parsing

---

## 📦 Dependencies

### Required

- ✅ **kubectl** - Kubernetes command-line tool
- ✅ **Node.js** - v14 or higher

### Not Required

- ❌ kubecolor (built-in syntax highlighting)
- ❌ fzf (built-in Ink selector)
- ❌ Go toolchain

---

## 🎯 Why TypeScript + Ink?

### Advantages

- ✅ **Type Safety** - Full TypeScript type checking
- ✅ **React for CLI** - Build CLI with React components
- ✅ **Rich UI** - Built-in Spinner, SelectInput, and more
- ✅ **Easy Maintenance** - Familiar React development patterns
- ✅ **npx Friendly** - Run directly with `npx kubefc`
- ✅ **No Compilation Dependencies** - No need for Go toolchain

### Comparison with Other Approaches

| Feature        | zsh Script              | Go CLI        | TypeScript + Ink |
| -------------- | ----------------------- | ------------- | ---------------- |
| Language       | Shell                   | Go            | TypeScript       |
| UI Framework   | None                    | None          | Ink (React)      |
| Type Safety    | ❌                      | ✅            | ✅               |
| Cross-platform | ❌                      | ✅            | ✅               |
| npx Support    | ❌                      | Needs wrapper | ✅ Native        |
| Development    | Simple                  | Traditional   | React Components |
| Dependencies   | kubectl, kubecolor, fzf | kubectl       | kubectl, Node.js |

---

## 🐛 Troubleshooting

### Deployment Not Found

```bash
# Check if namespace is correct
kubectl get deployments -n <namespace>

# Use correct namespace
kfc -n <namespace>
```

### Cannot Connect to Kubernetes

```bash
# Check kubectl configuration
kubectl config current-context
kubectl get pods

# Specify context
kfc -c <context> -n <namespace>
```

### Node.js Version Too Old

```bash
# Check Node.js version
node --version

# Requires v14 or higher
# Use nvm to upgrade
nvm install 18
nvm use 18
```

---

## 📚 Documentation

- [README_TS.md](README_TS.md) - Detailed TypeScript version documentation
- [COLOR_OUTPUT.md](COLOR_OUTPUT.md) - Color output features
- [KUBERNETES_SETUP.md](KUBERNETES_SETUP.md) - Kubernetes environment setup

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [kubectl](https://kubernetes.io/docs/reference/kubectl/) - Kubernetes CLI
- [@kubernetes/client-node](https://github.com/kubernetes-client/javascript) - Kubernetes Node.js client
- [chalk](https://github.com/chalk/chalk) - Terminal colors

---

## 🎊 Get Started

```bash
# Try it now!
npx kubefc -n kube-system coredns

# Or install globally
pnpm install -g @logan/kfc
kfc --help
```

**Enjoy beautiful Kubernetes logs!** 🚀✨
