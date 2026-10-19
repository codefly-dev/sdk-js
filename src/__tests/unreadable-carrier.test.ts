/**
 * A carrier this SDK cannot read must not look like a composition that
 * resolved nothing.
 *
 * The REST-only parser was wrong for one release and expensive for several:
 * a consumer pointed at a Connect endpoint got `[]`, which is also what a
 * genuinely empty composition returns, so the symptom pointed at codefly's
 * resolution rather than at this file. sdk-go states the rule the other way
 * round — "Absence is an answer; a failed read is not."
 */
import { getEndpoints, unreadableEndpointCarriers } from "../index";

const CARRIER = "CODEFLY__ENDPOINT__RECORD_STORE__RECORDS__CONNECT__CONNECT";

describe("an endpoint carrier this SDK cannot read", () => {
  const original = { ...process.env };
  let warned: string[] = [];
  let warn: typeof console.warn;

  beforeEach(() => {
    warned = [];
    warn = console.warn;
    console.warn = (message?: unknown) => {
      warned.push(String(message));
    };
  });

  afterEach(() => {
    console.warn = warn;
    process.env = { ...original };
  });

  it("is read when its protocol is supported", () => {
    process.env[CARRIER] = "127.0.0.1:50620";
    const found = getEndpoints().filter(
      (endpoint) => endpoint.service === "records",
    );
    expect(found).toHaveLength(1);
    expect(found[0].address).toBe("http://127.0.0.1:50620");
    expect(warned).toHaveLength(0);
  });

  it("is reported, not silently skipped, when its protocol is not", () => {
    const unsupported =
      "CODEFLY__ENDPOINT__RECORD_STORE__RECORDS__STREAM__WEBSOCKET";
    process.env[unsupported] = "127.0.0.1:50620";

    expect(getEndpoints()).toHaveLength(0);
    expect(unreadableEndpointCarriers()).toContain(unsupported);
    expect(warned.join("\n")).toContain(unsupported);
  });
});
