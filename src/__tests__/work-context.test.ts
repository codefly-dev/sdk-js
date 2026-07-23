import {
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import {
  WORK_CONTEXT_HEADER_NAME,
  WorkContextError,
  WorkContextSigner,
  WorkContextVerifier,
  attachWorkContext,
  parseWorkContextToken,
  workContextFromHeaders,
  type StartTaskInput,
  type WorkScopeV1,
} from "../work-context";

const NOW = new Date("2026-07-23T12:34:56.000Z");

function testPrivateKey() {
  const seed = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
  // RFC 8410 PKCS#8 prefix for an Ed25519 private seed.
  const pkcs8 = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    seed,
  ]);
  return createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
}

function testSigner(now = NOW) {
  return new WorkContextSigner({
    issuer: "https://accounts.codefly.dev/work-context",
    keyId: "work-context-test-2026-07",
    privateKey: testPrivateKey(),
    now: () => now,
    nonce: () => "nonce-fixed-for-golden",
  });
}

function testInput(): StartTaskInput {
  return {
    audience: "warden.evidence",
    tenantId: "tenant-codefly",
    ownerPrincipalId: "principal-antoine",
    taskId: "task-roadmap",
    sessionId: "session-root",
    authorizationRevision: 18_446_744_073_709_551_615n,
    replayPolicy: "idempotent",
    authorityScopes: [
      {
        resourceKind: "repository",
        actions: ["write", "read", "write"],
        resourceIds: ["repo-warden", "repo-codefly"],
      },
      {
        resourceKind: "evidence",
        actions: ["append"],
        resourceIds: [],
      },
    ],
    actorChain: [
      {
        principalId: "agent-claude-code",
        principalKind: "agent",
        delegationId: "delegation-1",
        grantedScopes: [
          {
            resourceKind: "repository",
            actions: ["write", "read"],
            resourceIds: ["repo-warden"],
          },
          {
            resourceKind: "evidence",
            actions: ["append"],
            resourceIds: [],
          },
        ],
      },
    ],
    attributionTeamIds: ["team-platform", "team-ai", "team-platform"],
    workspaceId: "workspace-deus",
    projectId: "project-warden",
    ttlSeconds: 300,
  };
}

function testVerifier(now = NOW) {
  return new WorkContextVerifier({
    publicKeys: new Map([
      [
        "work-context-test-2026-07",
        createPublicKey(testPrivateKey()),
      ],
    ]),
    now: () => now,
  });
}

describe("Work Context v1", () => {
  test("matches the Go wire golden byte for byte", () => {
    const { token } = testSigner().startTask(testInput());
    const expected =
      "eyJ0eXAiOiJjb2RlZmx5LndvcmstY29udGV4dC92MSIsImFsZ29yaXRobSI6IkVkMjU1MTkiLCJrZXlfaWQiOiJ3b3JrLWNvbnRleHQtdGVzdC0yMDI2LTA3IiwiaXNzdWVyIjoiaHR0cHM6Ly9hY2NvdW50cy5jb2RlZmx5LmRldi93b3JrLWNvbnRleHQiLCJhdWRpZW5jZSI6IndhcmRlbi5ldmlkZW5jZSIsIm5vdF9iZWZvcmVfdW5peCI6MTc4NDgxMDA5NiwiaXNzdWVkX2F0X3VuaXgiOjE3ODQ4MTAwOTYsImV4cGlyZXNfYXRfdW5peCI6MTc4NDgxMDM5Niwibm9uY2UiOiJub25jZS1maXhlZC1mb3ItZ29sZGVuIiwiYXV0aG9yaXphdGlvbl9yZXZpc2lvbiI6IjE4NDQ2NzQ0MDczNzA5NTUxNjE1IiwicmVwbGF5X3BvbGljeSI6ImlkZW1wb3RlbnQiLCJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtY29kZWZseSIsIm93bmVyX3ByaW5jaXBhbF9pZCI6InByaW5jaXBhbC1hbnRvaW5lIiwidGFza19pZCI6InRhc2stcm9hZG1hcCIsInNlc3Npb25faWQiOiJzZXNzaW9uLXJvb3QiLCJhdXRob3JpdHlfc2NvcGVzIjpbeyJyZXNvdXJjZV9raW5kIjoiZXZpZGVuY2UiLCJhY3Rpb25zIjpbImFwcGVuZCJdLCJyZXNvdXJjZV9pZHMiOltdfSx7InJlc291cmNlX2tpbmQiOiJyZXBvc2l0b3J5IiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiXSwicmVzb3VyY2VfaWRzIjpbInJlcG8tY29kZWZseSIsInJlcG8td2FyZGVuIl19XSwiYWN0b3JfY2hhaW4iOlt7InByaW5jaXBhbF9pZCI6ImFnZW50LWNsYXVkZS1jb2RlIiwicHJpbmNpcGFsX2tpbmQiOiJhZ2VudCIsImRlbGVnYXRpb25faWQiOiJkZWxlZ2F0aW9uLTEiLCJncmFudGVkX3Njb3BlcyI6W3sicmVzb3VyY2Vfa2luZCI6ImV2aWRlbmNlIiwiYWN0aW9ucyI6WyJhcHBlbmQiXSwicmVzb3VyY2VfaWRzIjpbXX0seyJyZXNvdXJjZV9raW5kIjoicmVwb3NpdG9yeSIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIl0sInJlc291cmNlX2lkcyI6WyJyZXBvLXdhcmRlbiJdfV19XSwiYXR0cmlidXRpb25fdGVhbV9pZHMiOlsidGVhbS1haSIsInRlYW0tcGxhdGZvcm0iXSwid29ya3NwYWNlX2lkIjoid29ya3NwYWNlLWRldXMiLCJwcm9qZWN0X2lkIjoicHJvamVjdC13YXJkZW4ifQ.pVZhqvPljkv6SyFD9UAg_oKC4SPj4hIV1Ha0W33cCV04IeaayLDe0w8iVgbxy9wwE2AWY8dXbIMmvnVk0QQRAQ";
    expect(token.encoded()).toBe(expected);
  });

  test("verifies identity and preserves full uint64 revision", () => {
    const { token, context } = testSigner().startTask(testInput());
    expect(context.attributionTeamIds).toEqual(["team-ai", "team-platform"]);
    expect(context.authorityScopes.map((scope) => scope.resourceKind)).toEqual([
      "evidence",
      "repository",
    ]);

    const verified = testVerifier().verify(token, {
      issuer: "https://accounts.codefly.dev/work-context",
      audience: "warden.evidence",
      tenantId: "tenant-codefly",
      ownerPrincipalId: "principal-antoine",
      taskId: "task-roadmap",
      sessionId: "session-root",
    });
    expect(verified.authorizationRevision).toBe(
      18_446_744_073_709_551_615n,
    );
    expect(
      verified.actorChain[verified.actorChain.length - 1]?.principalId,
    ).toBe("agent-claude-code");
  });

  test.each([
    ["audience", { audience: "other-service" }],
    ["tenant", { tenantId: "tenant-mind" }],
    ["owner", { ownerPrincipalId: "principal-other" }],
    ["task", { taskId: "task-other" }],
    ["session", { sessionId: "session-other" }],
  ])("rejects %s substitution", (_name, expected) => {
    const { token } = testSigner().startTask(testInput());
    expect(() => testVerifier().verify(token, expected)).toThrow(
      /mismatch/,
    );
  });

  test("rejects signature forgery", () => {
    const { token } = testSigner().startTask(testInput());
    const [payload, signature] = token.encoded().split(".");
    const bytes = Buffer.from(payload, "base64url");
    bytes[Math.floor(bytes.length / 2)] ^= 1;
    const forged = parseWorkContextToken(
      `${bytes.toString("base64url")}.${signature}`,
    );
    expect(() => testVerifier().verify(forged)).toThrow(
      /signature verification failed/,
    );
  });

  test("exchanges a child session without changing Task ownership", () => {
    const signer = testSigner();
    const { token: parent, context: root } = signer.startTask(testInput());
    const { token, context: child } = signer.startChildSession(parent, {
      sessionId: "session-child",
      audience: "warden.tools",
      actor: {
        principalId: "tool-codefly-editor",
        principalKind: "tool",
        delegationId: "delegation-2",
        grantedScopes: [
          {
            resourceKind: "repository",
            actions: ["write"],
            resourceIds: ["repo-warden"],
          },
        ],
      },
    });
    expect(child.tenantId).toBe(root.tenantId);
    expect(child.ownerPrincipalId).toBe(root.ownerPrincipalId);
    expect(child.taskId).toBe(root.taskId);
    expect(child.parentSessionId).toBe("session-root");
    expect(child.actorChain).toHaveLength(2);
    expect(
      testVerifier().verify(token, {
        audience: "warden.tools",
        parentSessionId: "session-root",
      }).actorChain[child.actorChain.length - 1]?.principalId,
    ).toBe("tool-codefly-editor");
  });

  test.each<[string, WorkScopeV1[]]>([
    [
      "new action",
      [
        {
          resourceKind: "repository",
          actions: ["admin"],
          resourceIds: ["repo-warden"],
        },
      ],
    ],
    [
      "new resource",
      [
        {
          resourceKind: "repository",
          actions: ["read"],
          resourceIds: ["repo-mind"],
        },
      ],
    ],
    [
      "explicit to wildcard",
      [
        {
          resourceKind: "repository",
          actions: ["read"],
          resourceIds: [],
        },
      ],
    ],
    [
      "new kind",
      [
        {
          resourceKind: "secrets",
          actions: ["read"],
          resourceIds: [],
        },
      ],
    ],
  ])("rejects child scope widening: %s", (_name, scopes) => {
    const signer = testSigner();
    const { token } = signer.startTask(testInput());
    expect(() =>
      signer.startChildSession(token, {
        sessionId: "session-child",
        actor: {
          principalId: "agent-child",
          principalKind: "agent",
          delegationId: "delegation-child",
          grantedScopes: scopes,
        },
      }),
    ).toThrow(/widens authority/);
  });

  test("rejects expiry and future activation", () => {
    const { token } = testSigner().startTask(testInput());
    expect(() =>
      testVerifier(new Date(NOW.getTime() + 7 * 60_000)).verify(token),
    ).toThrow(/expired/);

    const { token: future } = testSigner().startTask({
      ...testInput(),
      notBefore: new Date(NOW.getTime() + 2 * 60_000),
    });
    expect(() => testVerifier().verify(future)).toThrow(/not active/);
  });

  test("owns HTTP attachment and extraction", () => {
    const { token } = testSigner().startTask(testInput());
    const headers = new Headers();
    attachWorkContext(headers, token);
    expect(headers.get(WORK_CONTEXT_HEADER_NAME)).toBe(token.encoded());
    expect(workContextFromHeaders(headers).encoded()).toBe(token.encoded());
  });

  test.each(["", "one-segment", "a.b.c", "!!!.!!!"])(
    "malformed token fails closed: %s",
    (encoded) => {
      expect(() => {
        const token = parseWorkContextToken(encoded);
        testVerifier().verify(token);
      }).toThrow(WorkContextError);
    },
  );
});
