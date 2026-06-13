---
name: release
description: Releases one or more packages from the pi-packages monorepo via Release Please. Use when asked to release pi-credits, pi-spark, publish a new version, or apply a patch/minor/major or explicit version release.
---

# Release

This monorepo releases through [Release Please](https://github.com/googleapis/release-please) in manifest mode. The workflow `.github/workflows/release.yml` runs on every push to `main`. It:

1. Parses conventional commits and changed paths for each package.
2. Opens or updates a release PR that bumps package versions, package changelogs, and `.release-please-manifest.json`.
3. On merge, creates component tags and GitHub releases, then publishes the released package workspaces to npm with provenance.

Packages:

- `pi-credits` at `packages/pi-credits`
- `pi-spark` at `packages/pi-spark`

Tags include the component name, for example `pi-credits-v0.3.2` or `pi-spark-v0.10.3`.

## Decide the package and version

Determine what the user asked for:

- **No package given** → inspect the release PR and report which packages Release Please plans to release.
- **Package given** (`pi-credits` or `pi-spark`) → verify the release PR changes only that package unless the user requested multiple packages.
- **No version and no type given** → use the default version Release Please computed from conventional commits.
- **Explicit version given** (for example `0.10.3`) → use it verbatim for the named package.
- **Bump type given** (`patch`, `minor`, `major`) → compute the target version from that package's current `package.json` version.

When a version or type is given, confirm the target package and version if there is any ambiguity before pushing.

## Record a `Release-As` override

Only for an explicit version or bump type. The override commit must touch the target package path so Release Please associates the release with the right component.

Example for `pi-spark`:

```bash
printf '%s\n' "Release-As: 0.10.3" > packages/pi-spark/.release-trigger
git add packages/pi-spark/.release-trigger
git commit -m "chore(pi-spark): release 0.10.3" -m "Release-As: 0.10.3"
git push
```

Use `packages/pi-credits/.release-trigger` for `pi-credits`. After the workflow updates the release PR, verify the PR and remove or keep the trigger file according to the PR contents. Do not hand-edit release PR version bumps unless Release Please failed.

## Merge and pull the release PR

Find the open release PR:

```bash
gh pr list --label "autorelease: pending" --state open --json number,title,headRefName
```

If none is open, Release Please has not produced one yet. There may be no releasable commits, or the workflow from a `Release-As` push is still running. Re-check after the run finishes; do not hand-create the PR.

Inspect the release PR:

```bash
gh pr view <number> --json title,body,files
```

Verify that the changed files match the intended release. Expected files include:

- `.release-please-manifest.json`
- `pnpm-lock.yaml`
- `packages/pi-credits/CHANGELOG.md`
- `packages/pi-credits/package.json`
- `packages/pi-spark/CHANGELOG.md`
- `packages/pi-spark/package.json`

Then squash merge the PR and update local `main`:

```bash
gh pr merge <number> --squash
git checkout main && git pull
```

Merging triggers the workflow again to create component tags, create GitHub releases, and publish changed packages to npm. Optionally watch it:

```bash
gh run watch "$(gh run list --workflow=release.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')"
```

Report the released package versions and release URLs when done.
