import { HindsightClient } from "./client.js";
import { HindsightCompatibilityGate } from "./compatibility.js";
import type { HindsightConfig } from "./config.js";

/** How long a confirmed bank stays confirmed before the bank list is asked again. */
export const BANK_EXISTS_TTL_MS = 5 * 60 * 1000;

/**
 * The one place a bank id becomes a client.
 *
 * Shared by the MCP planner and the operator CLI (`enrich.mjs`) so both refuse the same banks for
 * the same reasons. A bank is accepted only when it is in the project's allowlist AND already
 * exists on the server. Existence is read from the bank list, never by touching the bank:
 * Hindsight creates a bank implicitly on first use, so "try it and see" would create exactly the
 * orphan this check exists to prevent.
 */
export class BankGate {
  /** One client per bank, created on first use. */
  private readonly clients = new Map<string, HindsightClient>();
  /**
   * When each bank was last confirmed to exist. Only positives are cached, and only for `ttlMs`: a
   * bank an operator deleted must stop being accepted, or the next write would recreate it.
   */
  private readonly confirmedAt = new Map<string, number>();
  /** One compatibility request shared by every bank client for this active configuration. */
  private readonly compatibility = new HindsightCompatibilityGate();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(
    private readonly config: Pick<HindsightConfig, "url" | "banks" | "defaultBank" | "getApiKey" | "configPath">,
    opts: { ttlMs?: number; now?: () => number } = {},
  ) {
    this.ttlMs = opts.ttlMs ?? BANK_EXISTS_TTL_MS;
    this.now = opts.now ?? Date.now;
  }

  /** A client for the default bank without the existence check — for tools that never touch a bank. */
  defaultClient(): HindsightClient {
    return this.clientFor(this.config.defaultBank);
  }

  private clientFor(bank: string): HindsightClient {
    let client = this.clients.get(bank);
    if (!client) {
      client = new HindsightClient(this.config.url, bank, this.config.getApiKey, this.compatibility);
      this.clients.set(bank, client);
    }
    return client;
  }

  /**
   * Resolve `requested` (empty → `defaultBank`) to a client, or to a refusal message. May throw on
   * a network failure while checking existence; callers turn that into an explained error.
   */
  async resolve(requested: unknown): Promise<HindsightClient | string> {
    const bank = requested === undefined || requested === null || requested === "" ? this.config.defaultBank : requested;
    if (typeof bank !== "string") return "Error: bank must be a string";
    if (!this.config.banks.includes(bank)) {
      return (
        `Refusing: bank "${bank}" is not in this project's allowlist (${this.config.banks.join(", ")}). ` +
        `Allowed banks are declared in ${this.config.configPath}.`
      );
    }
    const client = this.clientFor(bank);
    const at = this.confirmedAt.get(bank);
    if (at === undefined || this.now() - at >= this.ttlMs) {
      if (!(await client.bankExists(bank))) {
        this.confirmedAt.delete(bank);
        return (
          `Refusing: bank "${bank}" does not exist on ${this.config.url}. This client will not ` +
          `create it; an authorized operator must provision it separately.`
        );
      }
      this.confirmedAt.set(bank, this.now());
    }
    return client;
  }
}
