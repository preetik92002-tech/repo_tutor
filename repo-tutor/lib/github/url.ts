// Strict GitHub repository URL parsing. The result is only ever used to build
// URLs on two fixed hosts (api.github.com, raw.githubusercontent.com), so user
// input can never choose the host the server connects to (no SSRF).

export class GitHubError extends Error {
  constructor(
    public readonly code:
      | "INVALID_URL"
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "TOO_LARGE"
      | "EMPTY_REPO"
      | "NO_ANALYZABLE_FILES"
      | "TIMEOUT"
      | "NETWORK"
      | "UPSTREAM",
    message: string,
    public readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface RepoRef {
  owner: string;
  name: string;
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME_RE = /^[A-Za-z0-9._-]{1,100}$/;
export const MAX_URL_LENGTH = 300;

/** Accepts https://github.com/owner/name (optionally .git, trailing slash, /tree/... etc) or "owner/name". */
export function parseRepoUrl(input: string): RepoRef {
  const raw = (input ?? "").trim();
  if (!raw) throw new GitHubError("INVALID_URL", "Enter a GitHub repository URL.");
  if (raw.length > MAX_URL_LENGTH) throw new GitHubError("INVALID_URL", "That URL is too long.");
  if (/[\u0000-\u001f\s\\]/.test(raw)) throw new GitHubError("INVALID_URL", "The URL contains invalid characters.");

  let path: string;
  if (/^[^/:]+\/[^/:]+$/.test(raw)) {
    path = raw; // owner/name shorthand
  } else {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new GitHubError("INVALID_URL", "That doesn't look like a URL. Example: https://github.com/owner/repository");
    }
    if (u.protocol !== "https:") throw new GitHubError("INVALID_URL", "Only https:// GitHub URLs are supported.");
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      throw new GitHubError("INVALID_URL", "Only public github.com repositories are supported.");
    }
    if (u.username || u.password || (u.port && u.port !== "443")) {
      throw new GitHubError("INVALID_URL", "The URL must not contain credentials or a custom port.");
    }
    path = u.pathname.replace(/^\/+/, "");
  }

  const [owner, rawName] = path.split("/");
  const name = (rawName ?? "").replace(/\.git$/i, "");
  if (!owner || !name) throw new GitHubError("INVALID_URL", "The URL must include an owner and repository name.");
  if (!OWNER_RE.test(owner) || !NAME_RE.test(name) || name === "." || name === "..") {
    throw new GitHubError("INVALID_URL", "The owner or repository name is not valid.");
  }
  return { owner, name };
}

export const repoSlug = (r: RepoRef) => `${r.owner}/${r.name}`.toLowerCase();
