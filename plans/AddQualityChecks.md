# Plan: Add Quality Checks to Build Process

## Overview
Integrate automated code quality analysis, test coverage reporting, and security vulnerability scanning into the Dex MCP Server build process to maintain high code standards and catch issues early.

## Goals
1. Enforce consistent code quality standards
2. Track and improve test coverage
3. Identify security vulnerabilities before deployment
4. Integrate checks into CI/CD pipeline
5. Fail builds on critical issues

## Phase 1: Code Quality Analysis

### Tools to Add
- **ESLint** - Already in devDependencies, need to configure properly
- **Prettier** - Code formatting consistency
- **TypeScript strict mode** - Already enabled in tsconfig.json

### Implementation Steps
1. **Configure ESLint**
   - Create/update `.eslintrc.json` with strict rules
   - Add recommended TypeScript ESLint rules
   - Configure rules for MCP best practices (no console.log, etc.)
   - Add `eslint-plugin-security` for security-focused linting

2. **Add Prettier**
   - Install: `prettier`, `eslint-config-prettier`
   - Create `.prettierrc.json` with project conventions
   - Add `.prettierignore` for build outputs
   - Ensure ESLint and Prettier don't conflict

3. **Update package.json scripts**
   ```json
   {
     "lint": "eslint src/**/*.ts",
     "lint:fix": "eslint src/**/*.ts --fix",
     "format": "prettier --write \"src/**/*.ts\"",
     "format:check": "prettier --check \"src/**/*.ts\""
   }
   ```

4. **Add pre-commit hooks**
   - Install `husky` and `lint-staged`
   - Configure to run linting and formatting on staged files
   - Prevent commits with quality issues

### Success Criteria
- All existing code passes linting without errors
- Consistent code formatting across project
- Pre-commit hooks prevent bad commits

## Phase 2: Test Coverage

### Tools to Add
- **Jest** or **Vitest** - Test runner with coverage
- **c8** or built-in coverage tools

### Implementation Steps
1. **Set up test infrastructure**
   - Install testing framework: `vitest` (fast, TypeScript-native)
   - Install coverage tools: `@vitest/coverage-v8`
   - Create `vitest.config.ts` with coverage thresholds

2. **Configure coverage requirements**
   ```typescript
   // vitest.config.ts
   export default {
     test: {
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html', 'lcov'],
         lines: 80,
         functions: 80,
         branches: 75,
         statements: 80
       }
     }
   }
   ```

3. **Create initial test suite**
   - Unit tests for DexClient (src/dex-client.ts)
   - Unit tests for FuzzyMatcher (src/matching/fuzzy-matcher.ts)
   - Integration tests for tool handlers
   - Mock API responses for testing

4. **Update package.json scripts**
   ```json
   {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:coverage": "vitest run --coverage",
     "test:ci": "vitest run --coverage --reporter=verbose"
   }
   ```

5. **Add coverage reporting**
   - Generate HTML reports locally
   - Upload to Codecov or Coveralls (optional)
   - Display coverage badge in README

### Success Criteria
- Minimum 80% code coverage
- All critical paths tested
- Tests run in < 10 seconds
- Coverage reports generated on every build

## Phase 3: Security Vulnerability Scanning

### Tools to Add
- **npm audit** - Built-in dependency vulnerability scanner
- **Snyk** or **Socket.dev** - Advanced vulnerability detection
- **ESLint security plugin** - Static code analysis for security issues

### Implementation Steps
1. **Configure npm audit**
   - Add to build process
   - Set severity threshold (fail on high/critical)
   - Create `.npmrc` with audit settings

2. **Add Snyk (recommended)**
   - Install: `snyk`
   - Sign up for free Snyk account
   - Add `snyk test` to CI pipeline
   - Configure `.snyk` policy file for exceptions

3. **Alternative: Socket.dev**
   - Lighter weight than Snyk
   - Install: `@socketsecurity/cli`
   - Add to package.json scripts

4. **Update package.json scripts**
   ```json
   {
     "audit": "npm audit --audit-level=moderate",
     "audit:fix": "npm audit fix",
     "security": "snyk test",
     "security:monitor": "snyk monitor"
   }
   ```

5. **Add security checks to CI**
   - Run on every PR
   - Weekly scheduled scans
   - Alert on new vulnerabilities

### Success Criteria
- Zero high/critical vulnerabilities
- Automated alerts for new issues
- Clear remediation process
- Security scans complete in < 30 seconds

## Phase 4: CI/CD Integration

### GitHub Actions Workflow
Create `.github/workflows/quality-checks.yml`:

```yaml
name: Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Type check
        run: npm run build

      - name: Test with coverage
        run: npm run test:coverage

      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: Snyk security scan
        run: npx snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Local Development Integration
Update `package.json` to add composite commands:

```json
{
  "scripts": {
    "precommit": "lint-staged",
    "prepush": "npm run check",
    "check": "npm run lint && npm run format:check && npm run build && npm run test:coverage",
    "check:fix": "npm run lint:fix && npm run format && npm run build && npm run test:coverage"
  }
}
```

## Phase 5: Reporting and Monitoring

### Implementation Steps
1. **Local reporting**
   - Generate HTML coverage reports
   - Display summary in terminal
   - Save reports to `reports/` directory

2. **CI reporting**
   - Comment on PRs with coverage changes
   - Block merges if coverage decreases
   - Post results to Slack/Discord (optional)

3. **Dashboard integration**
   - Codecov dashboard for coverage trends
   - Snyk dashboard for vulnerability tracking
   - GitHub Actions summary for quick overview

4. **Documentation**
   - Update README with badges
   - Document how to run checks locally
   - Add troubleshooting guide

## Implementation Timeline

### Week 1: Code Quality
- [ ] Configure ESLint with strict rules
- [ ] Add Prettier configuration
- [ ] Set up pre-commit hooks
- [ ] Fix all existing linting issues

### Week 2: Test Coverage
- [ ] Set up Vitest with coverage
- [ ] Write tests for DexClient
- [ ] Write tests for FuzzyMatcher
- [ ] Write tests for tool handlers
- [ ] Achieve 80% coverage

### Week 3: Security Scanning
- [ ] Configure npm audit
- [ ] Set up Snyk account and integration
- [ ] Fix any existing vulnerabilities
- [ ] Document security policy

### Week 4: CI/CD Integration
- [ ] Create GitHub Actions workflow
- [ ] Add status checks to PRs
- [ ] Set up coverage reporting
- [ ] Update documentation

## Dependencies to Add

```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-security": "^2.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "snyk": "^1.1272.0",
    "vitest": "^1.0.0"
  }
}
```

## Configuration Files to Create

1. `.eslintrc.json` - ESLint rules
2. `.prettierrc.json` - Prettier formatting
3. `.prettierignore` - Files to skip formatting
4. `vitest.config.ts` - Test configuration
5. `.snyk` - Snyk policy
6. `.github/workflows/quality-checks.yml` - CI workflow
7. `.husky/pre-commit` - Pre-commit hooks
8. `lint-staged.config.js` - Lint-staged configuration

## Success Metrics

### Code Quality
- Zero ESLint errors
- 100% Prettier compliance
- All TypeScript strict mode enabled

### Test Coverage
- ≥80% line coverage
- ≥80% function coverage
- ≥75% branch coverage
- All critical paths tested

### Security
- Zero high/critical vulnerabilities
- All dependencies up to date
- Security scans run on every PR

### Build Performance
- Total check time: < 2 minutes locally
- CI pipeline: < 5 minutes
- Pre-commit hooks: < 10 seconds

## Rollout Strategy

1. **Soft launch** - Add tools without blocking builds
2. **Warning phase** - Show failures as warnings for 1 week
3. **Enforcement** - Enable blocking on failures
4. **Continuous improvement** - Gradually increase thresholds

## Risks and Mitigation

### Risk: Breaking existing workflow
**Mitigation**: Add tools incrementally, fix issues before enforcement

### Risk: Slow CI pipeline
**Mitigation**: Run checks in parallel, cache dependencies, optimize tests

### Risk: Too many false positives
**Mitigation**: Tune rules carefully, allow exceptions with justification

### Risk: Developer resistance
**Mitigation**: Provide clear documentation, automate fixes where possible

## Future Enhancements

- Add bundle size analysis (bundlephobia)
- Add performance benchmarking
- Add documentation coverage (TypeDoc)
- Add dependency update automation (Renovate/Dependabot)
- Add semantic versioning checks
- Add changelog automation

## References

- ESLint TypeScript: https://typescript-eslint.io/
- Vitest: https://vitest.dev/
- Snyk: https://snyk.io/
- Prettier: https://prettier.io/
- Husky: https://typicode.github.io/husky/
