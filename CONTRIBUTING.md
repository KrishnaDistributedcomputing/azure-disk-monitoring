# Contributing to Azure Disk Monitoring POC

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes: `git checkout -b feature/your-feature-name`
4. **Make your changes** and test them
5. **Commit** with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push** to your fork and open a **Pull Request**

## Development Setup

### Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) v2.50+
- [Bicep CLI](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/install) v0.24+
- [Node.js](https://nodejs.org/) v18+ and npm v9+
- An Azure subscription with Contributor access

### Dashboard Development

```bash
cd dashboard
npm install
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
```

### Infrastructure

```bash
cd infra
az bicep build --file main.bicep    # Validate Bicep templates
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Scopes:** `infra`, `dashboard`, `benchmarks`, `queries`, `scripts`, `docs`

**Examples:**
- `feat(dashboard): add disk IOPS heatmap visualization`
- `fix(infra): correct DCR counter specifier for Windows`
- `docs: update README with deployment instructions`
- `chore(dashboard): upgrade recharts to v2.13`

## Pull Request Process

1. Update the `CHANGELOG.md` if your change is user-facing
2. Ensure the dashboard builds without errors: `npm run build`
3. Ensure Bicep validates: `az bicep build --file infra/main.bicep`
4. Fill in the PR template completely
5. Request a review from a maintainer

## Code Style

- **Bicep**: Follow [Azure Bicep best practices](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/best-practices)
- **TypeScript/React**: Use the project ESLint configuration
- **KQL**: Use consistent formatting — uppercase keywords, lowercase functions
- **Shell scripts**: Use `shellcheck` for validation

## Adding New VMs or Disk Types

1. Add a new module call in `infra/main.bicep`
2. Add a new managed disk module call with appropriate tags
3. Update `dashboard/src/lib/mock-data.ts` with the new VM/disk config
4. Add FIO job files if testing new I/O patterns
5. Add corresponding KQL queries if new metrics are relevant

## Reporting Issues

Use the [issue templates](.github/ISSUE_TEMPLATE/) to report bugs or request features. Include:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Azure region and VM SKUs involved
- Dashboard screenshots if relevant

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
