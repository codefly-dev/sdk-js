import {
  KeyObject,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as signEd25519,
  verify as verifyEd25519,
} from "node:crypto";

export type WorkContextKeyLike = KeyObject | string | Buffer;

export const WORK_CONTEXT_HEADER_NAME = "x-codefly-work-context";
export const WORK_CONTEXT_TYPE = "codefly.work-context/v1";
export const WORK_CONTEXT_ALGORITHM = "Ed25519";
export const WORK_CONTEXT_REPLAY_IDEMPOTENT = "idempotent";
export const WORK_CONTEXT_REPLAY_SINGLE_USE = "single-use";

export const WORK_CONTEXT_MAX_ACTOR_DEPTH = 16;
export const WORK_CONTEXT_MAX_TOKEN_BYTES = 32 * 1024;
export const WORK_CONTEXT_DEFAULT_TTL_SECONDS = 5 * 60;
export const WORK_CONTEXT_MAX_TTL_SECONDS = 15 * 60;
export const WORK_CONTEXT_CLOCK_SKEW_SECONDS = 60;

const MAX_ID_BYTES = 512;
const MAX_KIND_BYTES = 128;
const MAX_SCOPES = 64;
const MAX_SCOPE_ENTRIES = 256;

export type WorkContextReplayPolicy =
  | typeof WORK_CONTEXT_REPLAY_IDEMPOTENT
  | typeof WORK_CONTEXT_REPLAY_SINGLE_USE;

export interface WorkScopeV1 {
  resourceKind: string;
  actions: string[];
  /** Empty means every resource of resourceKind. */
  resourceIds: string[];
}

export interface WorkActorV1 {
  principalId: string;
  principalKind: string;
  delegationId: string;
  grantedScopes: WorkScopeV1[];
}

export interface WorkContextV1 {
  typ: typeof WORK_CONTEXT_TYPE;
  algorithm: typeof WORK_CONTEXT_ALGORITHM;
  keyId: string;
  issuer: string;
  audience: string;
  notBeforeUnix: number;
  issuedAtUnix: number;
  expiresAtUnix: number;
  nonce: string;
  authorizationRevision: bigint;
  replayPolicy: WorkContextReplayPolicy;
  tenantId: string;
  ownerPrincipalId: string;
  taskId: string;
  sessionId: string;
  parentSessionId?: string;
  authorityScopes: WorkScopeV1[];
  actorChain: WorkActorV1[];
  attributionTeamIds: string[];
  workspaceId?: string;
  projectId?: string;
}

/** Minimal standard Headers surface required by Work Context propagation. */
export interface WorkContextHeaders {
  set(name: string, value: string): void;
  get(name: string): string | null;
}

export class WorkContextError extends Error {
  constructor(message: string) {
    super(`invalid Codefly Work Context: ${message}`);
    this.name = "WorkContextError";
  }
}

/** Opaque signed capability. Use attachWorkContext for HTTP propagation. */
export class WorkContextToken {
  readonly #encoded: string;

  private constructor(encoded: string) {
    this.#encoded = encoded;
  }

  encoded(): string {
    return this.#encoded;
  }

  static parse(encoded: string): WorkContextToken {
    validateTokenShape(encoded);
    return new WorkContextToken(encoded);
  }

  static signed(encoded: string): WorkContextToken {
    return new WorkContextToken(encoded);
  }
}

export function parseWorkContextToken(encoded: string): WorkContextToken {
  return WorkContextToken.parse(encoded);
}

/** Installs the SDK-owned Work Context carrier on a Headers object. */
export function attachWorkContext(
  headers: WorkContextHeaders,
  token: WorkContextToken,
): void {
  if (
    headers === null ||
    typeof headers !== "object" ||
    typeof headers.set !== "function"
  ) {
    throw new WorkContextError("headers must implement set(name, value)");
  }
  headers.set(WORK_CONTEXT_HEADER_NAME, token.encoded());
}

/** Returns fetch options with the signed context attached. */
export function withWorkContext(
  init: RequestInit,
  token: WorkContextToken,
): RequestInit {
  const headers = new Headers(init.headers);
  attachWorkContext(headers, token);
  return { ...init, headers };
}

/** Extracts an opaque token. This does not verify it. */
export function workContextFromHeaders(
  headers: WorkContextHeaders,
): WorkContextToken {
  const encoded = headers.get(WORK_CONTEXT_HEADER_NAME);
  if (!encoded) throw new WorkContextError("missing HTTP header");
  return parseWorkContextToken(encoded);
}

export interface WorkContextSignerOptions {
  issuer: string;
  keyId: string;
  privateKey: WorkContextKeyLike;
  now?: () => Date;
  nonce?: () => string;
}

export interface StartTaskInput {
  audience: string;
  tenantId: string;
  ownerPrincipalId: string;
  taskId: string;
  sessionId: string;
  authorizationRevision: bigint | number | string;
  replayPolicy?: WorkContextReplayPolicy;
  authorityScopes?: WorkScopeV1[];
  actorChain?: WorkActorV1[];
  attributionTeamIds?: string[];
  workspaceId?: string;
  projectId?: string;
  ttlSeconds?: number;
  notBefore?: Date;
}

export interface StartSessionInput {
  sessionId: string;
  audience?: string;
  replayPolicy?: WorkContextReplayPolicy;
  ttlSeconds?: number;
}

export interface StartChildSessionInput extends StartSessionInput {
  actor: WorkActorV1;
}

/** Authority-side signer. Product applications receive exchanged tokens and
 * must not be provisioned with this signer or its private key. */
export class WorkContextSigner {
  readonly #issuer: string;
  readonly #keyId: string;
  readonly #privateKey: KeyObject;
  readonly #publicKey: KeyObject;
  readonly #now: () => Date;
  readonly #nonce: () => string;

  constructor(options: WorkContextSignerOptions) {
    validateBounded("issuer", options.issuer, MAX_ID_BYTES, true);
    validateBounded("key_id", options.keyId, MAX_KIND_BYTES, true);
    this.#privateKey = asPrivateKey(options.privateKey);
    if (this.#privateKey.asymmetricKeyType !== "ed25519") {
      throw new WorkContextError("private key must be Ed25519");
    }
    this.#publicKey = createPublicKey(this.#privateKey);
    this.#issuer = options.issuer;
    this.#keyId = options.keyId;
    this.#now = options.now ?? (() => new Date());
    this.#nonce =
      options.nonce ?? (() => randomBytes(16).toString("base64url"));
  }

  startTask(input: StartTaskInput): {
    token: WorkContextToken;
    context: WorkContextV1;
  } {
    const now = unixSeconds(this.#now());
    const ttl = input.ttlSeconds ?? WORK_CONTEXT_DEFAULT_TTL_SECONDS;
    const context: WorkContextV1 = {
      typ: WORK_CONTEXT_TYPE,
      algorithm: WORK_CONTEXT_ALGORITHM,
      keyId: this.#keyId,
      issuer: this.#issuer,
      audience: input.audience,
      notBeforeUnix: input.notBefore
        ? unixSeconds(input.notBefore)
        : now,
      issuedAtUnix: now,
      expiresAtUnix: now + ttl,
      nonce: this.#nonce(),
      authorizationRevision: parseRevision(input.authorizationRevision),
      replayPolicy:
        input.replayPolicy ?? WORK_CONTEXT_REPLAY_IDEMPOTENT,
      tenantId: input.tenantId,
      ownerPrincipalId: input.ownerPrincipalId,
      taskId: input.taskId,
      sessionId: input.sessionId,
      authorityScopes: cloneScopes(input.authorityScopes ?? []),
      actorChain: cloneActors(input.actorChain ?? []),
      attributionTeamIds: [...(input.attributionTeamIds ?? [])],
      ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
    };
    return this.#sign(context);
  }

  startSession(
    parent: WorkContextToken,
    input: StartSessionInput,
  ): { token: WorkContextToken; context: WorkContextV1 } {
    const verified = this.#verifyOwn(parent);
    return this.#exchange(
      {
        ...cloneContext(verified),
        sessionId: input.sessionId,
        parentSessionId: undefined,
      },
      input,
    );
  }

  startChildSession(
    parent: WorkContextToken,
    input: StartChildSessionInput,
  ): { token: WorkContextToken; context: WorkContextV1 } {
    const verified = this.#verifyOwn(parent);
    return this.#exchange(
      {
        ...cloneContext(verified),
        sessionId: input.sessionId,
        parentSessionId: verified.sessionId,
        actorChain: [...cloneActors(verified.actorChain), cloneActor(input.actor)],
      },
      input,
    );
  }

  #verifyOwn(token: WorkContextToken): WorkContextV1 {
    const verifier = new WorkContextVerifier({
      publicKeys: new Map([[this.#keyId, this.#publicKey]]),
      now: this.#now,
    });
    return verifier.verify(token, { issuer: this.#issuer });
  }

  #exchange(
    source: WorkContextV1,
    input: StartSessionInput,
  ): { token: WorkContextToken; context: WorkContextV1 } {
    const now = unixSeconds(this.#now());
    const ttl = input.ttlSeconds ?? WORK_CONTEXT_DEFAULT_TTL_SECONDS;
    return this.#sign({
      ...source,
      typ: WORK_CONTEXT_TYPE,
      algorithm: WORK_CONTEXT_ALGORITHM,
      keyId: this.#keyId,
      issuer: this.#issuer,
      audience: input.audience ?? source.audience,
      notBeforeUnix: now,
      issuedAtUnix: now,
      expiresAtUnix: now + ttl,
      nonce: this.#nonce(),
      replayPolicy: input.replayPolicy ?? source.replayPolicy,
    });
  }

  #sign(source: WorkContextV1): {
    token: WorkContextToken;
    context: WorkContextV1;
  } {
    const context = canonicalizeWorkContext(source);
    validateWorkContext(context);
    const payload = Buffer.from(JSON.stringify(toPayload(context)), "utf8");
    const signature = signEd25519(null, payload, this.#privateKey);
    const encoded = `${payload.toString("base64url")}.${signature.toString(
      "base64url",
    )}`;
    if (Buffer.byteLength(encoded, "utf8") > WORK_CONTEXT_MAX_TOKEN_BYTES) {
      throw new WorkContextError(
        `token exceeds ${WORK_CONTEXT_MAX_TOKEN_BYTES} bytes`,
      );
    }
    return { token: WorkContextToken.signed(encoded), context };
  }
}

export interface WorkContextVerifierOptions {
  publicKeys:
    | ReadonlyMap<string, WorkContextKeyLike>
    | Record<string, WorkContextKeyLike>;
  now?: () => Date;
  clockSkewSeconds?: number;
}

export interface WorkContextExpectations {
  issuer?: string;
  audience?: string;
  tenantId?: string;
  ownerPrincipalId?: string;
  taskId?: string;
  sessionId?: string;
  parentSessionId?: string | null;
  authorizationRevision?: bigint | number | string;
}

export class WorkContextVerifier {
  readonly #publicKeys: ReadonlyMap<string, KeyObject>;
  readonly #now: () => Date;
  readonly #clockSkew: number;

  constructor(options: WorkContextVerifierOptions) {
    const entries =
      options.publicKeys instanceof Map
        ? [...options.publicKeys.entries()]
        : Object.entries(options.publicKeys);
    if (entries.length === 0) {
      throw new WorkContextError("no public verification keys");
    }
    const keys = new Map<string, KeyObject>();
    for (const [keyId, material] of entries) {
      validateBounded("key_id", keyId, MAX_KIND_BYTES, true);
      const publicKey = asPublicKey(material);
      if (publicKey.asymmetricKeyType !== "ed25519") {
        throw new WorkContextError(`public key ${keyId} must be Ed25519`);
      }
      keys.set(keyId, publicKey);
    }
    const clockSkew =
      options.clockSkewSeconds ?? WORK_CONTEXT_CLOCK_SKEW_SECONDS;
    if (
      !Number.isInteger(clockSkew) ||
      clockSkew < 0 ||
      clockSkew > WORK_CONTEXT_CLOCK_SKEW_SECONDS
    ) {
      throw new WorkContextError(
        `clock skew must be between zero and ${WORK_CONTEXT_CLOCK_SKEW_SECONDS} seconds`,
      );
    }
    this.#publicKeys = keys;
    this.#now = options.now ?? (() => new Date());
    this.#clockSkew = clockSkew;
  }

  verify(
    token: WorkContextToken,
    expected: WorkContextExpectations = {},
  ): WorkContextV1 {
    const { payload, signature } = decodeToken(token.encoded());
    const keyId = probeKeyId(payload);
    const publicKey = this.#publicKeys.get(keyId);
    if (!publicKey) {
      throw new WorkContextError(`unknown key id ${keyId}`);
    }
    if (!verifyEd25519(null, payload, publicKey, signature)) {
      throw new WorkContextError("signature verification failed");
    }
    const untrusted = parsePayload(payload);
    const context = fromPayload(untrusted);
    validateWorkContext(context);
    this.#validateTime(context);
    matchExpectations(context, expected);
    return context;
  }

  #validateTime(context: WorkContextV1): void {
    const now = unixSeconds(this.#now());
    if (now < context.notBeforeUnix - this.#clockSkew) {
      throw new WorkContextError("token is not active yet");
    }
    if (context.issuedAtUnix > now + this.#clockSkew) {
      throw new WorkContextError("token was issued in the future");
    }
    if (now > context.expiresAtUnix + this.#clockSkew) {
      throw new WorkContextError("token expired");
    }
  }
}

function probeKeyId(payload: Buffer): string {
  let value: unknown;
  try {
    value = JSON.parse(payload.toString("utf8"));
  } catch (error) {
    throw new WorkContextError(
      `decode key id: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkContextError("payload must be an object");
  }
  return stringValue(
    (value as Record<string, unknown>).key_id,
    "key_id",
  );
}

interface WorkContextPayload {
  typ: string;
  algorithm: string;
  key_id: string;
  issuer: string;
  audience: string;
  not_before_unix: number;
  issued_at_unix: number;
  expires_at_unix: number;
  nonce: string;
  authorization_revision: string;
  replay_policy: string;
  tenant_id: string;
  owner_principal_id: string;
  task_id: string;
  session_id: string;
  parent_session_id?: string;
  authority_scopes: WorkScopePayload[];
  actor_chain: WorkActorPayload[];
  attribution_team_ids: string[];
  workspace_id?: string;
  project_id?: string;
}

interface WorkScopePayload {
  resource_kind: string;
  actions: string[];
  resource_ids: string[];
}

interface WorkActorPayload {
  principal_id: string;
  principal_kind: string;
  delegation_id: string;
  granted_scopes: WorkScopePayload[];
}

function toPayload(context: WorkContextV1): WorkContextPayload {
  // Property order is part of the v1 signed wire contract and mirrors sdk-go.
  return {
    typ: context.typ,
    algorithm: context.algorithm,
    key_id: context.keyId,
    issuer: context.issuer,
    audience: context.audience,
    not_before_unix: context.notBeforeUnix,
    issued_at_unix: context.issuedAtUnix,
    expires_at_unix: context.expiresAtUnix,
    nonce: context.nonce,
    authorization_revision: context.authorizationRevision.toString(10),
    replay_policy: context.replayPolicy,
    tenant_id: context.tenantId,
    owner_principal_id: context.ownerPrincipalId,
    task_id: context.taskId,
    session_id: context.sessionId,
    ...(context.parentSessionId
      ? { parent_session_id: context.parentSessionId }
      : {}),
    authority_scopes: toScopePayloads(context.authorityScopes),
    actor_chain: context.actorChain.map((actor) => ({
      principal_id: actor.principalId,
      principal_kind: actor.principalKind,
      delegation_id: actor.delegationId,
      granted_scopes: toScopePayloads(actor.grantedScopes),
    })),
    attribution_team_ids: [...context.attributionTeamIds],
    ...(context.workspaceId ? { workspace_id: context.workspaceId } : {}),
    ...(context.projectId ? { project_id: context.projectId } : {}),
  };
}

function toScopePayloads(scopes: WorkScopeV1[]): WorkScopePayload[] {
  return scopes.map((scope) => ({
    resource_kind: scope.resourceKind,
    actions: [...scope.actions],
    resource_ids: [...scope.resourceIds],
  }));
}

function fromPayload(payload: WorkContextPayload): WorkContextV1 {
  return {
    typ: payload.typ as typeof WORK_CONTEXT_TYPE,
    algorithm: payload.algorithm as typeof WORK_CONTEXT_ALGORITHM,
    keyId: payload.key_id,
    issuer: payload.issuer,
    audience: payload.audience,
    notBeforeUnix: payload.not_before_unix,
    issuedAtUnix: payload.issued_at_unix,
    expiresAtUnix: payload.expires_at_unix,
    nonce: payload.nonce,
    authorizationRevision: parseRevision(payload.authorization_revision),
    replayPolicy: payload.replay_policy as WorkContextReplayPolicy,
    tenantId: payload.tenant_id,
    ownerPrincipalId: payload.owner_principal_id,
    taskId: payload.task_id,
    sessionId: payload.session_id,
    ...(payload.parent_session_id
      ? { parentSessionId: payload.parent_session_id }
      : {}),
    authorityScopes: payload.authority_scopes.map(fromScopePayload),
    actorChain: payload.actor_chain.map((actor) => ({
      principalId: actor.principal_id,
      principalKind: actor.principal_kind,
      delegationId: actor.delegation_id,
      grantedScopes: actor.granted_scopes.map(fromScopePayload),
    })),
    attributionTeamIds: [...payload.attribution_team_ids],
    ...(payload.workspace_id ? { workspaceId: payload.workspace_id } : {}),
    ...(payload.project_id ? { projectId: payload.project_id } : {}),
  };
}

function fromScopePayload(scope: WorkScopePayload): WorkScopeV1 {
  return {
    resourceKind: scope.resource_kind,
    actions: [...scope.actions],
    resourceIds: [...scope.resource_ids],
  };
}

function parsePayload(payload: Buffer): WorkContextPayload {
  let value: unknown;
  try {
    value = JSON.parse(payload.toString("utf8"));
  } catch (error) {
    throw new WorkContextError(
      `decode payload: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const root = exactRecord(value, "payload", [
    "typ",
    "algorithm",
    "key_id",
    "issuer",
    "audience",
    "not_before_unix",
    "issued_at_unix",
    "expires_at_unix",
    "nonce",
    "authorization_revision",
    "replay_policy",
    "tenant_id",
    "owner_principal_id",
    "task_id",
    "session_id",
    "parent_session_id",
    "authority_scopes",
    "actor_chain",
    "attribution_team_ids",
    "workspace_id",
    "project_id",
  ]);
  return {
    typ: stringValue(root.typ, "typ"),
    algorithm: stringValue(root.algorithm, "algorithm"),
    key_id: stringValue(root.key_id, "key_id"),
    issuer: stringValue(root.issuer, "issuer"),
    audience: stringValue(root.audience, "audience"),
    not_before_unix: integerValue(root.not_before_unix, "not_before_unix"),
    issued_at_unix: integerValue(root.issued_at_unix, "issued_at_unix"),
    expires_at_unix: integerValue(root.expires_at_unix, "expires_at_unix"),
    nonce: stringValue(root.nonce, "nonce"),
    authorization_revision: stringValue(
      root.authorization_revision,
      "authorization_revision",
    ),
    replay_policy: stringValue(root.replay_policy, "replay_policy"),
    tenant_id: stringValue(root.tenant_id, "tenant_id"),
    owner_principal_id: stringValue(
      root.owner_principal_id,
      "owner_principal_id",
    ),
    task_id: stringValue(root.task_id, "task_id"),
    session_id: stringValue(root.session_id, "session_id"),
    ...(root.parent_session_id === undefined
      ? {}
      : {
          parent_session_id: stringValue(
            root.parent_session_id,
            "parent_session_id",
          ),
        }),
    authority_scopes: scopePayloads(root.authority_scopes, "authority_scopes"),
    actor_chain: actorPayloads(root.actor_chain),
    attribution_team_ids: stringArray(
      root.attribution_team_ids,
      "attribution_team_ids",
    ),
    ...(root.workspace_id === undefined
      ? {}
      : { workspace_id: stringValue(root.workspace_id, "workspace_id") }),
    ...(root.project_id === undefined
      ? {}
      : { project_id: stringValue(root.project_id, "project_id") }),
  };
}

function scopePayloads(value: unknown, name: string): WorkScopePayload[] {
  if (!Array.isArray(value)) throw new WorkContextError(`${name} must be an array`);
  return value.map((item, index) => {
    const scope = exactRecord(item, `${name}[${index}]`, [
      "resource_kind",
      "actions",
      "resource_ids",
    ]);
    return {
      resource_kind: stringValue(scope.resource_kind, "resource_kind"),
      actions: stringArray(scope.actions, "actions"),
      resource_ids: stringArray(scope.resource_ids, "resource_ids"),
    };
  });
}

function actorPayloads(value: unknown): WorkActorPayload[] {
  if (!Array.isArray(value)) {
    throw new WorkContextError("actor_chain must be an array");
  }
  return value.map((item, index) => {
    const actor = exactRecord(item, `actor_chain[${index}]`, [
      "principal_id",
      "principal_kind",
      "delegation_id",
      "granted_scopes",
    ]);
    return {
      principal_id: stringValue(actor.principal_id, "principal_id"),
      principal_kind: stringValue(actor.principal_kind, "principal_kind"),
      delegation_id: stringValue(actor.delegation_id, "delegation_id"),
      granted_scopes: scopePayloads(
        actor.granted_scopes,
        `actor_chain[${index}].granted_scopes`,
      ),
    };
  });
}

function validateWorkContext(context: WorkContextV1): void {
  if (context.typ !== WORK_CONTEXT_TYPE) {
    throw new WorkContextError(`unsupported typ ${context.typ}`);
  }
  if (context.algorithm !== WORK_CONTEXT_ALGORITHM) {
    throw new WorkContextError(`unsupported algorithm ${context.algorithm}`);
  }
  for (const [name, value, max] of [
    ["key_id", context.keyId, MAX_KIND_BYTES],
    ["issuer", context.issuer, MAX_ID_BYTES],
    ["audience", context.audience, MAX_ID_BYTES],
    ["nonce", context.nonce, MAX_ID_BYTES],
    ["tenant_id", context.tenantId, MAX_ID_BYTES],
    ["owner_principal_id", context.ownerPrincipalId, MAX_ID_BYTES],
    ["task_id", context.taskId, MAX_ID_BYTES],
    ["session_id", context.sessionId, MAX_ID_BYTES],
  ] as const) {
    validateBounded(name, value, max, true);
  }
  for (const [name, value] of [
    ["parent_session_id", context.parentSessionId],
    ["workspace_id", context.workspaceId],
    ["project_id", context.projectId],
  ] as const) {
    validateBounded(name, value ?? "", MAX_ID_BYTES, false);
  }
  if (context.parentSessionId === context.sessionId) {
    throw new WorkContextError("parent session equals session");
  }
  if (
    context.replayPolicy !== WORK_CONTEXT_REPLAY_IDEMPOTENT &&
    context.replayPolicy !== WORK_CONTEXT_REPLAY_SINGLE_USE
  ) {
    throw new WorkContextError(
      `unsupported replay policy ${context.replayPolicy}`,
    );
  }
  if (context.notBeforeUnix > context.expiresAtUnix) {
    throw new WorkContextError("not-before is after expiry");
  }
  if (context.issuedAtUnix > context.expiresAtUnix) {
    throw new WorkContextError("issued-at is after expiry");
  }
  const ttl = context.expiresAtUnix - context.issuedAtUnix;
  if (ttl <= 0 || ttl > WORK_CONTEXT_MAX_TTL_SECONDS) {
    throw new WorkContextError(
      `lifetime must be positive and at most ${WORK_CONTEXT_MAX_TTL_SECONDS} seconds`,
    );
  }
  if (context.authorizationRevision < 0n) {
    throw new WorkContextError("authorization revision cannot be negative");
  }
  if (context.actorChain.length > WORK_CONTEXT_MAX_ACTOR_DEPTH) {
    throw new WorkContextError(
      `actor chain exceeds depth ${WORK_CONTEXT_MAX_ACTOR_DEPTH}`,
    );
  }
  if (context.attributionTeamIds.length > MAX_SCOPE_ENTRIES) {
    throw new WorkContextError("too many attribution teams");
  }
  validateSortedUnique(
    "attribution_team_ids",
    context.attributionTeamIds,
    MAX_ID_BYTES,
  );
  validateScopes("authority_scopes", context.authorityScopes);
  let previous = context.authorityScopes;
  context.actorChain.forEach((actor, index) => {
    validateBounded("actor principal_id", actor.principalId, MAX_ID_BYTES, true);
    validateBounded(
      "actor principal_kind",
      actor.principalKind,
      MAX_KIND_BYTES,
      true,
    );
    validateBounded(
      "actor delegation_id",
      actor.delegationId,
      MAX_ID_BYTES,
      true,
    );
    validateScopes(
      `actor_chain[${index}].granted_scopes`,
      actor.grantedScopes,
    );
    if (!scopesAttenuate(previous, actor.grantedScopes)) {
      throw new WorkContextError(`actor_chain[${index}] widens authority`);
    }
    previous = actor.grantedScopes;
  });
}

function validateScopes(name: string, scopes: WorkScopeV1[]): void {
  if (scopes.length > MAX_SCOPES) {
    throw new WorkContextError(`${name} exceeds ${MAX_SCOPES} scopes`);
  }
  let previousKind = "";
  scopes.forEach((scope, index) => {
    validateBounded(
      `${name} resource_kind`,
      scope.resourceKind,
      MAX_KIND_BYTES,
      true,
    );
    if (previousKind >= scope.resourceKind) {
      throw new WorkContextError(
        `${name} resource kinds must be sorted and unique`,
      );
    }
    previousKind = scope.resourceKind;
    if (
      scope.actions.length === 0 ||
      scope.actions.length > MAX_SCOPE_ENTRIES
    ) {
      throw new WorkContextError(
        `${name}[${index}] actions must contain 1..${MAX_SCOPE_ENTRIES} entries`,
      );
    }
    validateSortedUnique(`${name} actions`, scope.actions, MAX_KIND_BYTES);
    if (scope.resourceIds.length > MAX_SCOPE_ENTRIES) {
      throw new WorkContextError(`${name}[${index}] has too many resource IDs`);
    }
    validateSortedUnique(
      `${name} resource_ids`,
      scope.resourceIds,
      MAX_ID_BYTES,
    );
  });
}

function scopesAttenuate(
  parent: WorkScopeV1[],
  child: WorkScopeV1[],
): boolean {
  const parentByKind = new Map(
    parent.map((scope) => [scope.resourceKind, scope]),
  );
  return child.every((scope) => {
    const ancestor = parentByKind.get(scope.resourceKind);
    if (!ancestor || !subset(scope.actions, ancestor.actions)) return false;
    if (ancestor.resourceIds.length > 0) {
      return (
        scope.resourceIds.length > 0 &&
        subset(scope.resourceIds, ancestor.resourceIds)
      );
    }
    return true;
  });
}

function subset(child: string[], parent: string[]): boolean {
  const allowed = new Set(parent);
  return child.every((value) => allowed.has(value));
}

function canonicalizeWorkContext(source: WorkContextV1): WorkContextV1 {
  const context = cloneContext(source);
  context.authorityScopes = canonicalizeScopes(context.authorityScopes);
  context.actorChain = context.actorChain.map((actor) => ({
    ...actor,
    grantedScopes: canonicalizeScopes(actor.grantedScopes),
  }));
  context.attributionTeamIds = sortedUnique(context.attributionTeamIds);
  return context;
}

function canonicalizeScopes(scopes: WorkScopeV1[]): WorkScopeV1[] {
  return scopes
    .map((scope) => ({
      resourceKind: scope.resourceKind,
      actions: sortedUnique(scope.actions),
      resourceIds: sortedUnique(scope.resourceIds),
    }))
    .sort((left, right) => left.resourceKind.localeCompare(right.resourceKind));
}

function cloneContext(context: WorkContextV1): WorkContextV1 {
  return {
    ...context,
    authorityScopes: cloneScopes(context.authorityScopes),
    actorChain: cloneActors(context.actorChain),
    attributionTeamIds: [...context.attributionTeamIds],
  };
}

function cloneScopes(scopes: WorkScopeV1[]): WorkScopeV1[] {
  return scopes.map((scope) => ({
    resourceKind: scope.resourceKind,
    actions: [...scope.actions],
    resourceIds: [...scope.resourceIds],
  }));
}

function cloneActor(actor: WorkActorV1): WorkActorV1 {
  return {
    principalId: actor.principalId,
    principalKind: actor.principalKind,
    delegationId: actor.delegationId,
    grantedScopes: cloneScopes(actor.grantedScopes),
  };
}

function cloneActors(actors: WorkActorV1[]): WorkActorV1[] {
  return actors.map(cloneActor);
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function validateSortedUnique(
  name: string,
  values: string[],
  maxBytes: number,
): void {
  let previous = "";
  values.forEach((value, index) => {
    validateBounded(name, value, maxBytes, true);
    if (index > 0 && previous >= value) {
      throw new WorkContextError(`${name} must be sorted and unique`);
    }
    previous = value;
  });
}

function matchExpectations(
  context: WorkContextV1,
  expected: WorkContextExpectations,
): void {
  for (const [name, got, wanted] of [
    ["issuer", context.issuer, expected.issuer],
    ["audience", context.audience, expected.audience],
    ["tenant", context.tenantId, expected.tenantId],
    ["owner", context.ownerPrincipalId, expected.ownerPrincipalId],
    ["task", context.taskId, expected.taskId],
    ["session", context.sessionId, expected.sessionId],
  ] as const) {
    if (wanted !== undefined && wanted !== "" && got !== wanted) {
      throw new WorkContextError(`${name} mismatch`);
    }
  }
  if (
    expected.parentSessionId !== undefined &&
    (context.parentSessionId ?? null) !== expected.parentSessionId
  ) {
    throw new WorkContextError("parent session mismatch");
  }
  if (
    expected.authorizationRevision !== undefined &&
    context.authorizationRevision !==
      parseRevision(expected.authorizationRevision)
  ) {
    throw new WorkContextError("authorization revision mismatch");
  }
}

function decodeToken(encoded: string): {
  payload: Buffer;
  signature: Buffer;
} {
  validateTokenShape(encoded);
  const [payloadRaw, signatureRaw] = encoded.split(".");
  let payload: Buffer;
  let signature: Buffer;
  try {
    payload = Buffer.from(payloadRaw, "base64url");
    signature = Buffer.from(signatureRaw, "base64url");
  } catch (error) {
    throw new WorkContextError(
      `invalid base64url: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    payload.toString("base64url") !== payloadRaw ||
    signature.toString("base64url") !== signatureRaw
  ) {
    throw new WorkContextError("non-canonical base64url");
  }
  if (signature.byteLength !== 64) {
    throw new WorkContextError("signature must be 64 bytes");
  }
  return { payload, signature };
}

function validateTokenShape(encoded: string): void {
  if (!encoded) throw new WorkContextError("empty token");
  if (Buffer.byteLength(encoded, "utf8") > WORK_CONTEXT_MAX_TOKEN_BYTES) {
    throw new WorkContextError(
      `token exceeds ${WORK_CONTEXT_MAX_TOKEN_BYTES} bytes`,
    );
  }
  if (encoded.split(".").length !== 2) {
    throw new WorkContextError("token must have exactly two segments");
  }
}

function parseRevision(value: bigint | number | string): bigint {
  try {
    const parsed =
      typeof value === "bigint"
        ? value
        : typeof value === "number"
          ? BigInt(value)
          : BigInt(value);
    if (parsed < 0n || parsed > 18_446_744_073_709_551_615n) {
      throw new Error("outside uint64");
    }
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new Error("unsafe JavaScript integer; use bigint or decimal string");
    }
    return parsed;
  } catch (error) {
    throw new WorkContextError(
      `authorization_revision must be uint64: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function unixSeconds(value: Date): number {
  const millis = value.getTime();
  if (!Number.isFinite(millis)) throw new WorkContextError("invalid time");
  return Math.floor(millis / 1000);
}

function validateBounded(
  name: string,
  value: string,
  maxBytes: number,
  required: boolean,
): void {
  if (required && value.trim() === "") {
    throw new WorkContextError(`${name} is required`);
  }
  if (Buffer.byteLength(value, "utf8") > maxBytes) {
    throw new WorkContextError(`${name} exceeds ${maxBytes} bytes`);
  }
}

function asPrivateKey(key: WorkContextKeyLike): KeyObject {
  if (key instanceof KeyObject) {
    if (key.type !== "private") {
      throw new WorkContextError("private key material is not private");
    }
    return key;
  }
  return createPrivateKey(key);
}

function asPublicKey(key: WorkContextKeyLike): KeyObject {
  if (key instanceof KeyObject) {
    return key.type === "public" ? key : createPublicKey(key);
  }
  try {
    return createPublicKey(key);
  } catch {
    return createPublicKey(createPrivateKey(key));
  }
}

function exactRecord(
  value: unknown,
  name: string,
  allowedKeys: string[],
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new WorkContextError(`${name} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new WorkContextError(`${name} contains unknown field ${key}`);
    }
  }
  return record;
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new WorkContextError(`${name} must be a string`);
  }
  return value;
}

function integerValue(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new WorkContextError(`${name} must be a safe integer`);
  }
  return value;
}

function stringArray(value: unknown, name: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new WorkContextError(`${name} must be a string array`);
  }
  return [...value];
}
