# 📦 Release Guide

This project uses **GitHub Actions + OIDC Trusted Publishing** to automatically publish to npm.

---

## 🚀 Quick Release (3 Commands)

```bash
npm version patch              # Bump version
git push && git push --tags    # Push to GitHub
gh release create v0.1.x --title "v0.1.x" --notes "Description"  # Create release
```

GitHub Actions will automatically build and publish to npm. ✨

---

## 📋 Detailed Steps

### 1. Bump Version

```bash
# Patch version (0.1.8 → 0.1.9) - Bug fixes
npm version patch

# Minor version (0.1.8 → 0.2.0) - New features
npm version minor

# Major version (0.1.8 → 1.0.0) - Breaking changes
npm version major
```

This automatically:

- Updates version in `package.json`
- Creates git commit
- Creates git tag

### 2. Push to GitHub

```bash
git push && git push --tags
```

### 3. Create GitHub Release

Using gh CLI:

```bash
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes "
## 🚀 New Features
- Feature A description
- Feature B description

## 🐛 Bug Fixes
- Fix X description

## 🛠 Internal
- Internal changes
"
```

> **Note**: If you are pushing directly to master (not using Pull Requests), the `--generate-notes` flag will likely produce an empty changelog. **Always provide manual notes** describing the changes.

Or manually:

- Visit https://github.com/iml885203/kfc/releases/new
- Select the tag you just pushed
- Fill in release notes
- Click "Publish release"

### 4. Wait for Automatic Publishing

GitHub Actions will automatically (~30 seconds):

1. Build the project
2. Publish to npm with OIDC authentication
3. Generate provenance attestation

Monitor: https://github.com/iml885203/kfc/actions

---

## 🔍 Verify Publication

```bash
# Check npm version
npm view kfctl version

# Test installation
npx kfctl@latest --version
```

---

## 🐛 Troubleshooting

### Publishing Failed?

1. Check [GitHub Actions logs](https://github.com/iml885203/kfc/actions)
2. Common issues:
   - Version already exists on npm
   - Build errors
   - OIDC authentication issue (check npm Trusted Publisher settings)

### Unpublish a Version

```bash
# Within 24 hours of publishing
npm unpublish kfctl@0.1.9

# Or deprecate instead
npm deprecate kfctl@0.1.9 "Please use 0.1.10 instead"
```

---

## 📚 Resources

- [GitHub Releases](https://github.com/iml885203/kfc/releases)
- [npm Package](https://www.npmjs.com/package/kfctl)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
