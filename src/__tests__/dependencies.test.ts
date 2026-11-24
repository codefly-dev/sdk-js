import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { withDependencies } from "../dependencies";
import { DependencyAddressUnresolvedError } from "../errors";

// A stand-in codefly: `run service` records its pid and stays up like a real
// stack, and `get endpoints` answers with what the test wrote in `endpoints`.
function fakeCodefly(dir: string, endpoints: string): string {
  writeFileSync(join(dir, "endpoints"), endpoints);
  const bin = join(dir, "codefly");
  writeFileSync(
    bin,
    `#!/bin/sh
dir="$(dirname "$0")"
case "$1" in
  run) echo $$ > "$dir/run.pid"; exec sleep 60 ;;
  get)
    # Answer only once the stack process exists, so the test can name its pid.
    while [ ! -s "$dir/run.pid" ]; do sleep 0.05; done
    cat "$dir/endpoints"; exit 1 ;;
esac
exit 2
`,
  );
  chmodSync(bin, 0o755);
  return bin;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function until(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return condition();
}

describe("withDependencies readiness address", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "codefly-sdk-js-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects, naming the dependency, when codefly resolves no address", async () => {
    const bin = fakeCodefly(dir, "");

    const failure = await withDependencies({
      service: "frontend",
      readyService: "api",
      scope: "suite-a",
      codeflyBinary: bin,
      cwd: dir,
      readyTimeoutMs: 1_000,
    }).then(
      () => null,
      (err: unknown) => err,
    );

    expect(failure).toBeInstanceOf(DependencyAddressUnresolvedError);
    const unresolved = failure as DependencyAddressUnresolvedError;
    expect(unresolved.service).toBe("api");
    expect(unresolved.api).toBe("rest");
    expect(unresolved.scope).toBe("suite-a");
    expect(unresolved.message).toContain('dependency "api"');
    expect(unresolved.message).toContain('naming scope "suite-a"');
    // No address was invented to stand in for the missing one.
    expect(unresolved.message).not.toMatch(/localhost|127\.0\.0\.1|:\d{2,5}\b/);

    // The stack this call started is not left running behind the rejection.
    expect(await until(() => existsSync(join(dir, "run.pid")), 5_000)).toBe(true);
    const pid = Number(readFileSync(join(dir, "run.pid"), "utf8").trim());
    expect(await until(() => !alive(pid), 5_000)).toBe(true);
  });

  it("names the root service when no readyService is given", async () => {
    const bin = fakeCodefly(dir, "");

    await expect(
      withDependencies({ service: "frontend", codeflyBinary: bin, cwd: dir, scope: "" }),
    ).rejects.toThrow(/no rest endpoint address for dependency "frontend" \(/);
  });
});
