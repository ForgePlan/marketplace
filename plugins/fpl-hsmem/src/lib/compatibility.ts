export const HINDSIGHT_API_RANGE = ">=0.10.2 and <0.11.0";

interface VersionResponse {
  api_version?: unknown;
}

/**
 * Lazy, single-flight compatibility check for one configured Hindsight server.
 *
 * Successful and failed checks are both cached. A process must not send a later bank request after
 * the server has already proved incompatible, and concurrent first calls must not race several
 * `/version` requests.
 */
export class HindsightCompatibilityGate {
  private result: Promise<void> | undefined;

  assertCompatible(readVersion: () => Promise<unknown>): Promise<void> {
    if (!this.result) this.result = this.check(readVersion);
    return this.result;
  }

  private async check(readVersion: () => Promise<unknown>): Promise<void> {
    let response: unknown;
    try {
      response = await readVersion();
    } catch {
      throw new Error(
        `Hindsight compatibility check failed: /version could not be read; fpl-hsmem 3.7.0 requires API ${HINDSIGHT_API_RANGE}. No bank request was sent.`,
      );
    }

    const supplied =
      response !== null && typeof response === "object"
        ? (response as VersionResponse).api_version
        : undefined;
    if (typeof supplied !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(supplied)) {
      throw new Error(
        `Unsupported Hindsight API version (missing or malformed); fpl-hsmem 3.7.0 requires ${HINDSIGHT_API_RANGE}. No bank request was sent.`,
      );
    }

    const [major, minor, patch] = supplied.split(".").map(Number);
    if (major !== 0 || minor !== 10 || !Number.isSafeInteger(patch) || patch < 2) {
      throw new Error(
        `Unsupported Hindsight API version ${supplied}; fpl-hsmem 3.7.0 requires ${HINDSIGHT_API_RANGE}. No bank request was sent.`,
      );
    }
  }
}
