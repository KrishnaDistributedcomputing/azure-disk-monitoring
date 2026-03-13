# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-12

### Added

- **Infrastructure as Code**: Bicep modules for VNet, VMs (Linux + Windows), managed disks, Log Analytics, DCR, and Grafana
- **VM Fleet**: 5 VMs across D-series, E-series, and L-series families
- **Disk Coverage**: 8 managed data disks — Premium SSD, Premium SSD v2, Standard SSD, Standard HDD, Ultra Disk
- **Azure Monitor Agent**: Automated deployment with DCR for 13+ disk performance counters
- **Benchmark Suite**: 7 FIO profiles (sequential, random, mixed, latency, queue depth ramp) + DiskSpd for Windows
- **KQL Query Library**: 11 queries covering IOPS, throughput, latency, queue depth, capacity, VM/disk comparison
- **Web Dashboard**: Next.js + Tailwind + Recharts with 7 tabs (Overview, IOPS, Throughput, Latency, Queue Depth, Capacity, Comparison)
- **Deployment Scripts**: One-command deploy, teardown, and benchmark orchestration
- **Azure Resource Tagging**: Consistent tags across all resources (project, environment, cost-center, owner, etc.)
- **Mock Data**: Realistic data generator for dashboard development without Azure connectivity

[Unreleased]: https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring/releases/tag/v0.1.0
