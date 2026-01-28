# Contributing to OpenFarm

Thanks for your interest! OpenFarm is an open-source project and we welcome contributions.

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/openfarm.git
   cd openfarm
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Before You Code

- Read [AGENTS.md](./AGENTS.md) - This defines our coding standards
- Read [REVIEW.md](./REVIEW.md) - This is what reviewers check

### TDD (Test-Driven Development)

We follow strict TDD. Every feature starts with a **failing test**:

```bash
# 1. Write a failing test
# 2. Run it and verify it fails: bun run test
# 3. Write minimal code to pass
# 4. Run tests again: bun run test
# 5. Refactor if needed
```

### Running Tests

```bash
# Run all tests
bun run test

# Run specific file
bun run test -- path/to/file.test.ts

# With coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

### Code Quality

```bash
# Format code
bun run format

# Lint
bun run lint

# Type check
bun run typecheck

# All checks
bun run test && bun run lint && bun run typecheck
```

## Commit Guidelines

Use conventional commits:

```
feat(api): add webhook support
fix(core): resolve type inference issue
docs(sdk): update installation guide
test(agent): add integration tests for runner
refactor(types): simplify generic constraints
```

**Never include:**
- Secrets or credentials
- Binary files (images, videos)

## Pull Request Process

1. **Before pushing:** Run full check suite
   ```bash
   bun run test && bun run lint && bun run typecheck
   ```

2. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create PR** with:
   - Clear title describing change
   - Description of what/why (not how)
   - Reference any related issues: `Closes #123`
   - Link to any examples or documentation

4. **Address feedback** - We may ask for changes

5. **Squash commits** if needed (we prefer clean history)

## What Gets Reviewed

### Architecture
- [ ] Public API is clear
- [ ] No breaking changes (unless major version)
- [ ] Follows semver principles

### Code Quality
- [ ] No `any` types (use `unknown`)
- [ ] Types are explicit
- [ ] Names reveal intent
- [ ] Self-documenting

### Testing
- [ ] Test exists and fails first (TDD)
- [ ] Tests pass: `bun run test`
- [ ] Coverage maintained (≥80%)
- [ ] Test names describe behavior

### Documentation
- [ ] README updated if needed
- [ ] JSDoc for public APIs
- [ ] Examples added if applicable
- [ ] CHANGELOG entry (if applicable)

## Red Flags

We'll ask to revise if:
- ❌ No tests
- ❌ Test passes immediately (means it's not testing new behavior)
- ❌ Breaking changes without major version bump
- ❌ `any` types used
- ❌ Secrets in code
- ❌ No documentation

## Versioning

OpenFarm follows [Semantic Versioning 2.0.0](https://semver.org/).

See [VERSIONING.md](./docs/VERSIONING.md) for:
- When to bump MAJOR, MINOR, or PATCH versions
- Release process
- Pre-release guidelines

## Questions?

- 📖 See [README.md](./README.md)
- 🏗️ See [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- 📦 See [VERSIONING.md](./docs/VERSIONING.md)
- 💬 Open an issue to discuss first (for large changes)

---

**Remember:** Every line is public. Quality > Speed. We're building tools developers worldwide depend on.
