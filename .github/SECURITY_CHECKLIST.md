# Security Checklist

This checklist should be completed before each release and periodically during development.

## Pre-Release Security Checklist

### Code Quality & Security Analysis
- [ ] All tests pass: `npm test`
- [ ] Test coverage meets thresholds (≥80%): `npm run test:coverage`
- [ ] No ESLint errors: `npm run lint`
- [ ] Code is properly formatted: `npm run format:check`
- [ ] TypeScript compilation successful: `npm run build`

### Dependency Security
- [ ] No npm audit vulnerabilities (moderate or higher): `npm audit --audit-level=moderate`
- [ ] Snyk scan passes: `npm run security` (requires Snyk authentication)
- [ ] Dependencies are up to date: Review `npm outdated`
- [ ] No unmaintained dependencies: Check for deprecation warnings

### Code Review
- [ ] No `console.log()` statements in source code (violates MCP protocol)
- [ ] No hardcoded credentials or API keys
- [ ] No PII in error messages or logs
- [ ] All tool inputs are validated
- [ ] Error handling doesn't leak sensitive data
- [ ] No use of `eval()` or similar dangerous functions

### Configuration & Environment
- [ ] `.env` file is gitignored (verify with `git check-ignore .env`)
- [ ] No credentials in version control history
- [ ] Environment variables documented in README
- [ ] Example `.env.example` file is up to date

### API Security
- [ ] All API calls use HTTPS
- [ ] API keys are loaded from environment variables
- [ ] API client has proper timeout configuration
- [ ] Rate limiting is respected
- [ ] Error responses don't expose internal details

### Data Handling
- [ ] No PII stored locally (only in-memory cache)
- [ ] Cache expiration is properly implemented (5-minute TTL)
- [ ] No unnecessary data collection
- [ ] Data minimization principle followed

### Documentation
- [ ] SECURITY.md is up to date
- [ ] CHANGELOG documents security-related changes
- [ ] README security section is accurate
- [ ] Breaking changes are documented

### CI/CD Pipeline
- [ ] GitHub Actions workflow passes all checks
- [ ] Security scans run on every PR
- [ ] Coverage reports are generated
- [ ] No secrets exposed in CI logs

## Ongoing Security Practices

### Weekly
- [ ] Review Dependabot alerts
- [ ] Check for new security advisories in dependencies
- [ ] Review GitHub Security tab

### Monthly
- [ ] Run full security audit: `npm run check`
- [ ] Review and update dependencies: `npm update`
- [ ] Check Snyk dashboard for trends
- [ ] Review access logs (if available)

### Quarterly
- [ ] Review and update SECURITY.md
- [ ] Audit third-party integrations
- [ ] Review threat model for changes
- [ ] Security training for contributors

## Vulnerability Response

If a vulnerability is found:

1. **Assess severity** (Critical, High, Medium, Low)
2. **Check for patches** (`npm audit fix` or Snyk auto-fix)
3. **Test the patch** (ensure functionality isn't broken)
4. **Deploy quickly** for critical/high severity issues
5. **Document** in CHANGELOG and security advisory
6. **Notify users** if the vulnerability affects deployed instances

## Security Tools Reference

```bash
# Run all checks
npm run check

# Individual security checks
npm audit --audit-level=moderate  # Check dependencies
npm run security                   # Snyk scan (requires auth)
npm run lint                       # ESLint with security plugin

# Auto-fix issues
npm audit fix                      # Fix npm vulnerabilities
npm run lint:fix                   # Fix ESLint issues
npm run format                     # Format code
```

## Authentication Setup

### Snyk (One-time setup)
```bash
# 1. Create account at https://snyk.io
# 2. Authenticate locally
npx snyk auth

# 3. For CI/CD, add SNYK_TOKEN to GitHub Secrets
# Get token from: https://app.snyk.io/account
```

### GitHub Actions
Ensure these secrets are set in repository settings:
- `SNYK_TOKEN` - Snyk API token for security scanning
- `CODECOV_TOKEN` (optional) - For coverage reporting

## Additional Resources

- [SECURITY.md](../SECURITY.md) - Full security policy
- [npm audit docs](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk documentation](https://docs.snyk.io/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Notes

- This checklist should be reviewed and updated as security practices evolve
- Not all items may apply to every release - use judgment
- When in doubt, consult the security policy or ask for a security review
- Security is everyone's responsibility - if you see something, say something!
