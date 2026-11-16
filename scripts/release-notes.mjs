/**
 * The GitHub release body, built from `docs/CHANGELOG.md`.
 *
 *   node scripts/release-notes.mjs 0.7.1 > notes.md
 *
 * The body used to be a literal in `.github/workflows/release.yml`, and it
 * drifted: 0.7.1 shipped with the 0.6.1 text, and it still pointed at a settings
 * page the update check had moved off. The changelog is already the user-facing
 * account of a release, so the only part kept here is the text that does not
 * change between versions.
 *
 * A missing section is an error, not an empty body: publishing a release with
 * no notes is worse than failing the build.
 */

import { readFileSync } from "node:fs";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("usage: release-notes.mjs <major.minor.patch>");
  process.exit(1);
}

const changelog = readFileSync("docs/CHANGELOG.md", "utf8");
const heading = `## ${version}\n`;
const start = changelog.indexOf(heading);
if (start === -1) {
  console.error(`docs/CHANGELOG.md has no "## ${version}" section`);
  process.exit(1);
}

const afterHeading = start + heading.length;
const next = changelog.indexOf("\n## ", afterHeading);
const section = (next === -1 ? changelog.slice(afterHeading) : changelog.slice(afterHeading, next)).trim();

if (!section) {
  console.error(`the "## ${version}" section of docs/CHANGELOG.md is empty`);
  process.exit(1);
}

/** Stable across releases, so it lives here rather than in every changelog entry. */
const PREAMBLE =
  "**Alpha software.** Under active development: things can break, and a release may " +
  "change behaviour without notice. Take a backup from Settings → Data & Backup before " +
  "importing real data.";

/**
 * GitHub renders a release body line by line: a newline inside a paragraph or a list
 * item becomes a line break, unlike a comment. The changelog is hard-wrapped at 80
 * columns for editing, so every sentence used to stop mid-width on the release page.
 * Joining the continuation lines back into one line per paragraph and per bullet lets
 * the page wrap the text itself.
 */
function unwrap(section) {
  return section
    .split(/\n{2,}/)
    .map((block) => {
      const out = [];
      for (const line of block.split("\n").map((l) => l.trim())) {
        if (!line) continue;
        const startsItem = /^([-*]|\d+\.)\s/.test(line);
        if (startsItem || out.length === 0) out.push(line);
        else if (/^(\||>|#|:::)/.test(line)) out.push(line);
        else out[out.length - 1] += ` ${line}`;
      }
      return out.join("\n");
    })
    .join("\n\n");
}


const ABOUT = `## The app

A native macOS app for tracking assets and their value over time.

Everything stays on your Mac: a local SQLite database, provider API keys in the macOS Keychain, no account and no telemetry. AI is off until you configure a provider.

Requires macOS 11+ on Apple silicon. The build is signed ad hoc (no Apple Developer ID yet), so macOS blocks the first launch: allow it in System Settings → Privacy & Security → **Open Anyway**, or right-click the app → **Open** on macOS 14 and older. The terminal equivalent is \`xattr -dr com.apple.quarantine /Applications/FinanceTracker.app\`, which does the same thing for a copy you trust. Later updates arrive through **Check for updates** in Settings → **General**.`;

process.stdout.write(`${PREAMBLE}\n\n## What's new in ${version}\n\n${unwrap(section)}\n\n${ABOUT}\n`);
