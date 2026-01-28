# Code Review Guidelines - OpenFarm (OSS)

## Before You Review

- Read the PR description and linked issues first
- Check the diff size (keep reviews focused)
- Run tests locally: `bun run test`
- Check coverage: `bun run test:coverage`

## What to Check

### Architecture
- [ ] Public API design is clear and documented
- [ ] No breaking changes without major version bump
- [ ] Follows semver principles
- [ ] Exports are intentional and documented

### Code Quality
- [ ] Types are explicit (no `any`)
- [ ] Self-documenting (names reveal intent)
- [ ] No dead code or unused imports
- [ ] Error handling is proper

### Testing
- [ ] New behavior has failing test first (TDD)
- [ ] Tests pass: `bun run test`
- [ ] Coverage maintained or improved (≥80%)
- [ ] Test names describe behavior

### Docs
- [ ] README updated if needed
- [ ] JSDoc for public APIs
- [ ] Examples updated if applicable
- [ ] CHANGELOG entry exists (if applicable)

## Red Flags 🚩

- **No tests** - Ask for them
- **Test passes immediately** - Probably testing existing behavior
- **Multiple features in one PR** - Ask to split
- **Breaking API changes** - Requires major version
- **No documentation** - Public code needs docs
- **Secrets in code** - Hard stop, reject

## Approve When

✅ Tests pass
✅ Coverage maintained
✅ Code is clear
✅ No breaking changes
✅ Documentation complete

---

**Remember:** Every line is public. Quality > Speed.
