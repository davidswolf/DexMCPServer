# Security Policy

## Overview

Dex MCP Server handles Personally Identifiable Information (PII) from your personal CRM. We take security seriously and are committed to protecting your data and maintaining the confidentiality of your contacts.

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Data Handling

### What Data We Process

This MCP server processes the following types of PII:

- Contact names, emails, phone numbers
- Social media profiles and URLs
- Interaction history (notes, reminders)
- Relationship context and metadata

### Data Storage

- **No local storage**: This server does NOT store any PII locally
- **In-memory only**: Contact data is cached temporarily in memory (30-minute TTL by default)
- **API proxy**: All data is retrieved from and written to the Dex API
- **No logging**: PII is never logged to stdout, stderr, or log files

### API Credentials

- **Environment variables**: API keys must be stored in `.env` or environment variables
- **Never committed**: The `.env` file is gitignored and should NEVER be committed
- **Secure transmission**: All API calls use HTTPS with TLS 1.2+
- **Key rotation**: Rotate your Dex API key if compromised

## Security Best Practices

### For Users

1. **Protect your API key**: Never share your `DEX_API_KEY` or commit it to version control
2. **Use environment variables**: Store credentials in `.env` or system environment variables
3. **Keep updated**: Regularly update to the latest version for security patches
4. **Review permissions**: Ensure your Dex API key has minimal required permissions
5. **Monitor access**: Review Claude Desktop logs for unexpected behavior

### For Developers

1. **No console.log**: Never use `console.log()` - it pollutes stdout and may leak PII
2. **Use console.error**: Only use `console.error()` for critical errors (goes to stderr)
3. **Validate inputs**: All tool inputs are validated and sanitized
4. **Handle errors safely**: Error messages should not include PII
5. **Secure dependencies**: Run `npm audit` and `npm run security` before releasing
6. **Code review**: All changes must pass linting, tests, and security scans

## Vulnerability Reporting

### How to Report

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. **Email**: Send details to the repository maintainer (check GitHub profile)
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Initial response**: Within 48 hours
- **Severity assessment**: Within 5 business days
- **Fix timeline**:
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We follow **coordinated disclosure**
- Security fixes are released before public disclosure
- We will credit reporters (unless they prefer to remain anonymous)
- We publish security advisories for all fixed vulnerabilities

## Security Features

### Current Protections

- **TypeScript strict mode**: Catches type-related bugs at compile time
- **ESLint security plugin**: Static analysis for security issues
- **Dependency scanning**: Automated vulnerability detection with Snyk and npm audit
- **HTTPS only**: All API communication uses encrypted connections
- **Input validation**: All tool inputs are validated against JSON schemas
- **Error handling**: Structured error responses without data leakage
- **Memory safety**: Automatic cache expiration prevents data accumulation

### Automated Scanning

This repository uses multiple automated security tools:

- **npm audit**: Scans for known vulnerabilities in dependencies (runs on every CI build)
- **Snyk**: Advanced vulnerability detection and remediation (runs on every CI build)
- **ESLint security plugin**: Detects common security anti-patterns
- **Dependabot**: Automated security updates for dependencies (GitHub)

## Threat Model

### In Scope

- Unauthorized access to PII through the MCP server
- Data leakage through logs or error messages
- Dependency vulnerabilities
- Injection attacks through tool inputs
- API key exposure

### Out of Scope

- Security of the Dex API itself
- Security of Claude Desktop application
- Network security (user's responsibility)
- Physical security of user's machine

## Incident Response

If a security incident occurs:

1. **Immediate**: Revoke compromised API keys
2. **Containment**: Identify and isolate affected systems
3. **Investigation**: Determine scope and impact
4. **Remediation**: Deploy fixes and patches
5. **Communication**: Notify affected users
6. **Post-mortem**: Document incident and prevent recurrence

## Compliance

This MCP server is designed with the following principles:

- **Data minimization**: Only request necessary PII
- **Purpose limitation**: Only use data for intended CRM features
- **Transparency**: Clear documentation of data handling
- **Security by design**: Security considerations in all development decisions

**Note**: Users are responsible for ensuring their use of this tool complies with applicable laws and regulations (GDPR, CCPA, etc.) in their jurisdiction.

## Security Checklist for Releases

Before each release, maintainers must verify:

- [ ] All tests pass (100% of test suite)
- [ ] No ESLint errors or warnings
- [ ] No high or critical npm audit vulnerabilities
- [ ] Snyk scan passes (or exceptions documented)
- [ ] No sensitive data in commit history
- [ ] Dependencies are up to date
- [ ] CHANGELOG documents any security-related changes

## Contact

For security-related questions or concerns:

- Create a GitHub issue (for non-sensitive topics)
- Email the maintainer (for sensitive vulnerabilities)

## References

- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/security)
- [Dex API Security](https://getdex.com/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
