# Security Policy

## Scope

This repository is a **Proof of Concept (POC)** for Azure disk performance monitoring. It is designed for learning and experimentation, not production use.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by [opening a GitHub issue](https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring/issues/new?labels=security&template=bug_report.md).

Since this is a POC project:
- There are no SLAs for response times
- Security fixes will be addressed on a best-effort basis
- If the vulnerability is in a dependency, update the dependency via `npm audit fix`

## Security Considerations

This POC intentionally prioritizes observability over security. The following are known and accepted for the POC phase:

- VMs may have public IPs for SSH access during benchmarking
- NSGs are not tightly scoped
- No Private Link or private endpoints are configured
- Disk encryption is not enabled
- RBAC is not fine-grained
- Secrets (SSH keys, passwords) are passed as deployment parameters

**Do not use this configuration in production.** For production deployment, review the [Azure Well-Architected Framework Security Pillar](https://learn.microsoft.com/en-us/azure/well-architected/security/).

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
