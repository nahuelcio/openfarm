# Versioning

OpenFarm follows [Semantic Versioning 2.0.0](https://semver.org/) for all releases.

## Version Format

```
MAJOR.MINOR.PATCH
```

### Rules

- **MAJOR** version: Incompatible API changes (breaking changes)
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

## Examples

```
1.0.0  → Initial release
1.1.0  → Added new feature (backwards compatible)
1.1.1  → Fixed a bug
2.0.0  → Breaking change (incompatible with 1.x)
```

## Release Process

1. **Update version** in `package.json`
2. **Update CHANGELOG** (what changed and why)
3. **Commit:** `git commit -m "chore: release v1.1.0"`
4. **Create Release** on GitHub with tag `v1.1.0`
5. **GitHub Actions** automatically publishes to npm

## When to Bump

### PATCH (1.0.0 → 1.0.1)
- Bug fixes
- Minor improvements
- Documentation updates

### MINOR (1.0.0 → 1.1.0)
- New features
- New public APIs
- New adapters or engines
- *All previous versions still work*

### MAJOR (1.0.0 → 2.0.0)
- Removing public APIs
- Changing function signatures
- Changing core behavior
- *Requires user migration*

## Pre-releases

For experimental versions, use:
- `1.0.0-alpha.1`
- `1.0.0-beta.1`
- `1.0.0-rc.1`

Tag as "Pre-release" on GitHub.

---

**Learn more:** https://semver.org/
