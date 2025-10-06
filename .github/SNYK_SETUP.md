# Snyk CI/CD Setup Guide

## Local Setup (Completed ✅)

Snyk has been authenticated locally and is ready to use:

```bash
# Test for vulnerabilities
npm run security

# Monitor project (get email alerts for new vulnerabilities)
npx snyk monitor
```

**Current status:**
- ✅ Snyk authenticated
- ✅ Project monitored: [View Dashboard](https://app.snyk.io/org/davidswolf)
- ✅ 101 dependencies scanned, 0 vulnerabilities found
- ✅ Email notifications enabled for new issues

## GitHub Actions CI/CD Setup

To enable Snyk scanning in your GitHub Actions workflow, you need to add your Snyk API token as a repository secret.

### Step 1: Get Your Snyk API Token

1. Go to https://app.snyk.io/account
2. Scroll to the "API Token" section
3. Click "Click to show" to reveal your token
4. Copy the token (it looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 2: Add Secret to GitHub Repository

1. Go to your GitHub repository: https://github.com/davidswolf/DexMCPServer
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set:
   - **Name**: `SNYK_TOKEN`
   - **Secret**: Paste your API token from Step 1
5. Click **Add secret**

### Step 3: Verify CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/quality-checks.yml`) is already configured to use Snyk.

Push a commit or create a PR to trigger the workflow and verify it works:

```bash
git add .
git commit -m "Enable Snyk scanning"
git push
```

Check the Actions tab to see Snyk running: https://github.com/davidswolf/DexMCPServer/actions

### Current Workflow Configuration

The Snyk scan is configured in `.github/workflows/quality-checks.yml`:

```yaml
- name: Snyk security scan
  run: npx snyk test
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  continue-on-error: true  # Won't block builds if Snyk fails
```

**Note:** `continue-on-error: true` means Snyk failures won't block the build. To enforce strict security checks, change this to `false`.

## Security Scanning Results

### Local Machine
- **Status**: ✅ Enabled
- **Command**: `npm run security`
- **Monitoring**: Active (email notifications enabled)

### CI/CD Pipeline
- **Status**: ⚠️ Requires SNYK_TOKEN secret
- **Triggers**: On push to main/develop, and on all PRs
- **Results**: Visible in GitHub Actions logs

## Snyk Dashboard

View detailed vulnerability reports and monitoring:
- **Organization**: https://app.snyk.io/org/davidswolf
- **Project**: Check dashboard for "dexmcpserver"

## Troubleshooting

### Snyk test fails with auth error
```bash
# Re-authenticate
npx snyk auth
```

### CI/CD shows "Authentication error"
- Verify SNYK_TOKEN secret is set correctly in GitHub
- Token should be from https://app.snyk.io/account
- No quotes or extra spaces in the secret value

### Want to run tests without blocking builds
The workflow is already configured with `continue-on-error: true`. This logs results but doesn't fail the build.

### Want to enforce strict security checks
Edit `.github/workflows/quality-checks.yml` and change:
```yaml
continue-on-error: false  # Fail builds on vulnerabilities
```

## Additional Commands

```bash
# Test for vulnerabilities
npx snyk test

# Monitor project (upload snapshot for ongoing monitoring)
npx snyk monitor

# Test and output JSON results
npx snyk test --json

# Test with severity threshold
npx snyk test --severity-threshold=high

# Ignore dev dependencies
npx snyk test --dev=false

# Check authentication status
npx snyk auth
```

## Security Policy

For vulnerability exceptions and policies, edit `.snyk` in the project root.

## Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk GitHub Actions](https://github.com/snyk/actions)
- [Security Policy](../SECURITY.md)
