"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _WorkContextToken_encoded, _WorkContextSigner_instances, _WorkContextSigner_issuer, _WorkContextSigner_keyId, _WorkContextSigner_privateKey, _WorkContextSigner_publicKey, _WorkContextSigner_now, _WorkContextSigner_nonce, _WorkContextSigner_verifyOwn, _WorkContextSigner_exchange, _WorkContextSigner_sign, _WorkContextVerifier_instances, _WorkContextVerifier_publicKeys, _WorkContextVerifier_now, _WorkContextVerifier_clockSkew, _WorkContextVerifier_validateTime;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkContextVerifier = exports.WorkContextSigner = exports.WorkContextToken = exports.WorkContextError = exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS = exports.WORK_CONTEXT_MAX_TTL_SECONDS = exports.WORK_CONTEXT_DEFAULT_TTL_SECONDS = exports.WORK_CONTEXT_MAX_TOKEN_BYTES = exports.WORK_CONTEXT_MAX_ACTOR_DEPTH = exports.WORK_CONTEXT_REPLAY_SINGLE_USE = exports.WORK_CONTEXT_REPLAY_IDEMPOTENT = exports.WORK_CONTEXT_ALGORITHM = exports.WORK_CONTEXT_TYPE = exports.WORK_CONTEXT_HEADER_NAME = void 0;
exports.parseWorkContextToken = parseWorkContextToken;
exports.attachWorkContext = attachWorkContext;
exports.withWorkContext = withWorkContext;
exports.workContextFromHeaders = workContextFromHeaders;
const node_crypto_1 = require("node:crypto");
exports.WORK_CONTEXT_HEADER_NAME = "x-codefly-work-context";
exports.WORK_CONTEXT_TYPE = "codefly.work-context/v1";
exports.WORK_CONTEXT_ALGORITHM = "Ed25519";
exports.WORK_CONTEXT_REPLAY_IDEMPOTENT = "idempotent";
exports.WORK_CONTEXT_REPLAY_SINGLE_USE = "single-use";
exports.WORK_CONTEXT_MAX_ACTOR_DEPTH = 16;
exports.WORK_CONTEXT_MAX_TOKEN_BYTES = 32 * 1024;
exports.WORK_CONTEXT_DEFAULT_TTL_SECONDS = 5 * 60;
exports.WORK_CONTEXT_MAX_TTL_SECONDS = 15 * 60;
exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS = 60;
const MAX_ID_BYTES = 512;
const MAX_KIND_BYTES = 128;
const MAX_SCOPES = 64;
const MAX_SCOPE_ENTRIES = 256;
class WorkContextError extends Error {
    constructor(message) {
        super(`invalid Codefly Work Context: ${message}`);
        this.name = "WorkContextError";
    }
}
exports.WorkContextError = WorkContextError;
/** Opaque signed capability. Use attachWorkContext for HTTP propagation. */
class WorkContextToken {
    constructor(encoded) {
        _WorkContextToken_encoded.set(this, void 0);
        __classPrivateFieldSet(this, _WorkContextToken_encoded, encoded, "f");
    }
    encoded() {
        return __classPrivateFieldGet(this, _WorkContextToken_encoded, "f");
    }
    static parse(encoded) {
        validateTokenShape(encoded);
        return new WorkContextToken(encoded);
    }
    static signed(encoded) {
        return new WorkContextToken(encoded);
    }
}
exports.WorkContextToken = WorkContextToken;
_WorkContextToken_encoded = new WeakMap();
function parseWorkContextToken(encoded) {
    return WorkContextToken.parse(encoded);
}
/** Installs the SDK-owned Work Context carrier on a Headers object. */
function attachWorkContext(headers, token) {
    if (headers === null ||
        typeof headers !== "object" ||
        typeof headers.set !== "function") {
        throw new WorkContextError("headers must implement set(name, value)");
    }
    headers.set(exports.WORK_CONTEXT_HEADER_NAME, token.encoded());
}
/** Returns fetch options with the signed context attached. */
function withWorkContext(init, token) {
    const headers = new Headers(init.headers);
    attachWorkContext(headers, token);
    return { ...init, headers };
}
/** Extracts an opaque token. This does not verify it. */
function workContextFromHeaders(headers) {
    const encoded = headers.get(exports.WORK_CONTEXT_HEADER_NAME);
    if (!encoded)
        throw new WorkContextError("missing HTTP header");
    return parseWorkContextToken(encoded);
}
/** Authority-side signer. Product applications receive exchanged tokens and
 * must not be provisioned with this signer or its private key. */
class WorkContextSigner {
    constructor(options) {
        _WorkContextSigner_instances.add(this);
        _WorkContextSigner_issuer.set(this, void 0);
        _WorkContextSigner_keyId.set(this, void 0);
        _WorkContextSigner_privateKey.set(this, void 0);
        _WorkContextSigner_publicKey.set(this, void 0);
        _WorkContextSigner_now.set(this, void 0);
        _WorkContextSigner_nonce.set(this, void 0);
        validateBounded("issuer", options.issuer, MAX_ID_BYTES, true);
        validateBounded("key_id", options.keyId, MAX_KIND_BYTES, true);
        __classPrivateFieldSet(this, _WorkContextSigner_privateKey, asPrivateKey(options.privateKey), "f");
        if (__classPrivateFieldGet(this, _WorkContextSigner_privateKey, "f").asymmetricKeyType !== "ed25519") {
            throw new WorkContextError("private key must be Ed25519");
        }
        __classPrivateFieldSet(this, _WorkContextSigner_publicKey, (0, node_crypto_1.createPublicKey)(__classPrivateFieldGet(this, _WorkContextSigner_privateKey, "f")), "f");
        __classPrivateFieldSet(this, _WorkContextSigner_issuer, options.issuer, "f");
        __classPrivateFieldSet(this, _WorkContextSigner_keyId, options.keyId, "f");
        __classPrivateFieldSet(this, _WorkContextSigner_now, options.now ?? (() => new Date()), "f");
        __classPrivateFieldSet(this, _WorkContextSigner_nonce, options.nonce ?? (() => (0, node_crypto_1.randomBytes)(16).toString("base64url")), "f");
    }
    startTask(input) {
        const now = unixSeconds(__classPrivateFieldGet(this, _WorkContextSigner_now, "f").call(this));
        const ttl = input.ttlSeconds ?? exports.WORK_CONTEXT_DEFAULT_TTL_SECONDS;
        const context = {
            typ: exports.WORK_CONTEXT_TYPE,
            algorithm: exports.WORK_CONTEXT_ALGORITHM,
            keyId: __classPrivateFieldGet(this, _WorkContextSigner_keyId, "f"),
            issuer: __classPrivateFieldGet(this, _WorkContextSigner_issuer, "f"),
            audience: input.audience,
            notBeforeUnix: input.notBefore
                ? unixSeconds(input.notBefore)
                : now,
            issuedAtUnix: now,
            expiresAtUnix: now + ttl,
            nonce: __classPrivateFieldGet(this, _WorkContextSigner_nonce, "f").call(this),
            authorizationRevision: parseRevision(input.authorizationRevision),
            replayPolicy: input.replayPolicy ?? exports.WORK_CONTEXT_REPLAY_IDEMPOTENT,
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
        return __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_sign).call(this, context);
    }
    startSession(parent, input) {
        const verified = __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_verifyOwn).call(this, parent);
        return __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_exchange).call(this, {
            ...cloneContext(verified),
            sessionId: input.sessionId,
            parentSessionId: undefined,
        }, input);
    }
    startChildSession(parent, input) {
        const verified = __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_verifyOwn).call(this, parent);
        return __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_exchange).call(this, {
            ...cloneContext(verified),
            sessionId: input.sessionId,
            parentSessionId: verified.sessionId,
            actorChain: [...cloneActors(verified.actorChain), cloneActor(input.actor)],
        }, input);
    }
}
exports.WorkContextSigner = WorkContextSigner;
_WorkContextSigner_issuer = new WeakMap(), _WorkContextSigner_keyId = new WeakMap(), _WorkContextSigner_privateKey = new WeakMap(), _WorkContextSigner_publicKey = new WeakMap(), _WorkContextSigner_now = new WeakMap(), _WorkContextSigner_nonce = new WeakMap(), _WorkContextSigner_instances = new WeakSet(), _WorkContextSigner_verifyOwn = function _WorkContextSigner_verifyOwn(token) {
    const verifier = new WorkContextVerifier({
        publicKeys: new Map([[__classPrivateFieldGet(this, _WorkContextSigner_keyId, "f"), __classPrivateFieldGet(this, _WorkContextSigner_publicKey, "f")]]),
        now: __classPrivateFieldGet(this, _WorkContextSigner_now, "f"),
    });
    return verifier.verify(token, { issuer: __classPrivateFieldGet(this, _WorkContextSigner_issuer, "f") });
}, _WorkContextSigner_exchange = function _WorkContextSigner_exchange(source, input) {
    const now = unixSeconds(__classPrivateFieldGet(this, _WorkContextSigner_now, "f").call(this));
    const ttl = input.ttlSeconds ?? exports.WORK_CONTEXT_DEFAULT_TTL_SECONDS;
    return __classPrivateFieldGet(this, _WorkContextSigner_instances, "m", _WorkContextSigner_sign).call(this, {
        ...source,
        typ: exports.WORK_CONTEXT_TYPE,
        algorithm: exports.WORK_CONTEXT_ALGORITHM,
        keyId: __classPrivateFieldGet(this, _WorkContextSigner_keyId, "f"),
        issuer: __classPrivateFieldGet(this, _WorkContextSigner_issuer, "f"),
        audience: input.audience ?? source.audience,
        notBeforeUnix: now,
        issuedAtUnix: now,
        expiresAtUnix: now + ttl,
        nonce: __classPrivateFieldGet(this, _WorkContextSigner_nonce, "f").call(this),
        replayPolicy: input.replayPolicy ?? source.replayPolicy,
    });
}, _WorkContextSigner_sign = function _WorkContextSigner_sign(source) {
    const context = canonicalizeWorkContext(source);
    validateWorkContext(context);
    const payload = Buffer.from(JSON.stringify(toPayload(context)), "utf8");
    const signature = (0, node_crypto_1.sign)(null, payload, __classPrivateFieldGet(this, _WorkContextSigner_privateKey, "f"));
    const encoded = `${payload.toString("base64url")}.${signature.toString("base64url")}`;
    if (Buffer.byteLength(encoded, "utf8") > exports.WORK_CONTEXT_MAX_TOKEN_BYTES) {
        throw new WorkContextError(`token exceeds ${exports.WORK_CONTEXT_MAX_TOKEN_BYTES} bytes`);
    }
    return { token: WorkContextToken.signed(encoded), context };
};
class WorkContextVerifier {
    constructor(options) {
        _WorkContextVerifier_instances.add(this);
        _WorkContextVerifier_publicKeys.set(this, void 0);
        _WorkContextVerifier_now.set(this, void 0);
        _WorkContextVerifier_clockSkew.set(this, void 0);
        const entries = options.publicKeys instanceof Map
            ? [...options.publicKeys.entries()]
            : Object.entries(options.publicKeys);
        if (entries.length === 0) {
            throw new WorkContextError("no public verification keys");
        }
        const keys = new Map();
        for (const [keyId, material] of entries) {
            validateBounded("key_id", keyId, MAX_KIND_BYTES, true);
            const publicKey = asPublicKey(material);
            if (publicKey.asymmetricKeyType !== "ed25519") {
                throw new WorkContextError(`public key ${keyId} must be Ed25519`);
            }
            keys.set(keyId, publicKey);
        }
        const clockSkew = options.clockSkewSeconds ?? exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS;
        if (!Number.isInteger(clockSkew) ||
            clockSkew < 0 ||
            clockSkew > exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS) {
            throw new WorkContextError(`clock skew must be between zero and ${exports.WORK_CONTEXT_CLOCK_SKEW_SECONDS} seconds`);
        }
        __classPrivateFieldSet(this, _WorkContextVerifier_publicKeys, keys, "f");
        __classPrivateFieldSet(this, _WorkContextVerifier_now, options.now ?? (() => new Date()), "f");
        __classPrivateFieldSet(this, _WorkContextVerifier_clockSkew, clockSkew, "f");
    }
    verify(token, expected = {}) {
        const { payload, signature } = decodeToken(token.encoded());
        const keyId = probeKeyId(payload);
        const publicKey = __classPrivateFieldGet(this, _WorkContextVerifier_publicKeys, "f").get(keyId);
        if (!publicKey) {
            throw new WorkContextError(`unknown key id ${keyId}`);
        }
        if (!(0, node_crypto_1.verify)(null, payload, publicKey, signature)) {
            throw new WorkContextError("signature verification failed");
        }
        const untrusted = parsePayload(payload);
        const context = fromPayload(untrusted);
        validateWorkContext(context);
        __classPrivateFieldGet(this, _WorkContextVerifier_instances, "m", _WorkContextVerifier_validateTime).call(this, context);
        matchExpectations(context, expected);
        return context;
    }
}
exports.WorkContextVerifier = WorkContextVerifier;
_WorkContextVerifier_publicKeys = new WeakMap(), _WorkContextVerifier_now = new WeakMap(), _WorkContextVerifier_clockSkew = new WeakMap(), _WorkContextVerifier_instances = new WeakSet(), _WorkContextVerifier_validateTime = function _WorkContextVerifier_validateTime(context) {
    const now = unixSeconds(__classPrivateFieldGet(this, _WorkContextVerifier_now, "f").call(this));
    if (now < context.notBeforeUnix - __classPrivateFieldGet(this, _WorkContextVerifier_clockSkew, "f")) {
        throw new WorkContextError("token is not active yet");
    }
    if (context.issuedAtUnix > now + __classPrivateFieldGet(this, _WorkContextVerifier_clockSkew, "f")) {
        throw new WorkContextError("token was issued in the future");
    }
    if (now > context.expiresAtUnix + __classPrivateFieldGet(this, _WorkContextVerifier_clockSkew, "f")) {
        throw new WorkContextError("token expired");
    }
};
function probeKeyId(payload) {
    let value;
    try {
        value = JSON.parse(payload.toString("utf8"));
    }
    catch (error) {
        throw new WorkContextError(`decode key id: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new WorkContextError("payload must be an object");
    }
    return stringValue(value.key_id, "key_id");
}
function toPayload(context) {
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
function toScopePayloads(scopes) {
    return scopes.map((scope) => ({
        resource_kind: scope.resourceKind,
        actions: [...scope.actions],
        resource_ids: [...scope.resourceIds],
    }));
}
function fromPayload(payload) {
    return {
        typ: payload.typ,
        algorithm: payload.algorithm,
        keyId: payload.key_id,
        issuer: payload.issuer,
        audience: payload.audience,
        notBeforeUnix: payload.not_before_unix,
        issuedAtUnix: payload.issued_at_unix,
        expiresAtUnix: payload.expires_at_unix,
        nonce: payload.nonce,
        authorizationRevision: parseRevision(payload.authorization_revision),
        replayPolicy: payload.replay_policy,
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
function fromScopePayload(scope) {
    return {
        resourceKind: scope.resource_kind,
        actions: [...scope.actions],
        resourceIds: [...scope.resource_ids],
    };
}
function parsePayload(payload) {
    let value;
    try {
        value = JSON.parse(payload.toString("utf8"));
    }
    catch (error) {
        throw new WorkContextError(`decode payload: ${error instanceof Error ? error.message : String(error)}`);
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
        authorization_revision: stringValue(root.authorization_revision, "authorization_revision"),
        replay_policy: stringValue(root.replay_policy, "replay_policy"),
        tenant_id: stringValue(root.tenant_id, "tenant_id"),
        owner_principal_id: stringValue(root.owner_principal_id, "owner_principal_id"),
        task_id: stringValue(root.task_id, "task_id"),
        session_id: stringValue(root.session_id, "session_id"),
        ...(root.parent_session_id === undefined
            ? {}
            : {
                parent_session_id: stringValue(root.parent_session_id, "parent_session_id"),
            }),
        authority_scopes: scopePayloads(root.authority_scopes, "authority_scopes"),
        actor_chain: actorPayloads(root.actor_chain),
        attribution_team_ids: stringArray(root.attribution_team_ids, "attribution_team_ids"),
        ...(root.workspace_id === undefined
            ? {}
            : { workspace_id: stringValue(root.workspace_id, "workspace_id") }),
        ...(root.project_id === undefined
            ? {}
            : { project_id: stringValue(root.project_id, "project_id") }),
    };
}
function scopePayloads(value, name) {
    if (!Array.isArray(value))
        throw new WorkContextError(`${name} must be an array`);
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
function actorPayloads(value) {
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
            granted_scopes: scopePayloads(actor.granted_scopes, `actor_chain[${index}].granted_scopes`),
        };
    });
}
function validateWorkContext(context) {
    if (context.typ !== exports.WORK_CONTEXT_TYPE) {
        throw new WorkContextError(`unsupported typ ${context.typ}`);
    }
    if (context.algorithm !== exports.WORK_CONTEXT_ALGORITHM) {
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
    ]) {
        validateBounded(name, value, max, true);
    }
    for (const [name, value] of [
        ["parent_session_id", context.parentSessionId],
        ["workspace_id", context.workspaceId],
        ["project_id", context.projectId],
    ]) {
        validateBounded(name, value ?? "", MAX_ID_BYTES, false);
    }
    if (context.parentSessionId === context.sessionId) {
        throw new WorkContextError("parent session equals session");
    }
    if (context.replayPolicy !== exports.WORK_CONTEXT_REPLAY_IDEMPOTENT &&
        context.replayPolicy !== exports.WORK_CONTEXT_REPLAY_SINGLE_USE) {
        throw new WorkContextError(`unsupported replay policy ${context.replayPolicy}`);
    }
    if (context.notBeforeUnix > context.expiresAtUnix) {
        throw new WorkContextError("not-before is after expiry");
    }
    if (context.issuedAtUnix > context.expiresAtUnix) {
        throw new WorkContextError("issued-at is after expiry");
    }
    const ttl = context.expiresAtUnix - context.issuedAtUnix;
    if (ttl <= 0 || ttl > exports.WORK_CONTEXT_MAX_TTL_SECONDS) {
        throw new WorkContextError(`lifetime must be positive and at most ${exports.WORK_CONTEXT_MAX_TTL_SECONDS} seconds`);
    }
    if (context.authorizationRevision < 0n) {
        throw new WorkContextError("authorization revision cannot be negative");
    }
    if (context.actorChain.length > exports.WORK_CONTEXT_MAX_ACTOR_DEPTH) {
        throw new WorkContextError(`actor chain exceeds depth ${exports.WORK_CONTEXT_MAX_ACTOR_DEPTH}`);
    }
    if (context.attributionTeamIds.length > MAX_SCOPE_ENTRIES) {
        throw new WorkContextError("too many attribution teams");
    }
    validateSortedUnique("attribution_team_ids", context.attributionTeamIds, MAX_ID_BYTES);
    validateScopes("authority_scopes", context.authorityScopes);
    let previous = context.authorityScopes;
    context.actorChain.forEach((actor, index) => {
        validateBounded("actor principal_id", actor.principalId, MAX_ID_BYTES, true);
        validateBounded("actor principal_kind", actor.principalKind, MAX_KIND_BYTES, true);
        validateBounded("actor delegation_id", actor.delegationId, MAX_ID_BYTES, true);
        validateScopes(`actor_chain[${index}].granted_scopes`, actor.grantedScopes);
        if (!scopesAttenuate(previous, actor.grantedScopes)) {
            throw new WorkContextError(`actor_chain[${index}] widens authority`);
        }
        previous = actor.grantedScopes;
    });
}
function validateScopes(name, scopes) {
    if (scopes.length > MAX_SCOPES) {
        throw new WorkContextError(`${name} exceeds ${MAX_SCOPES} scopes`);
    }
    let previousKind = "";
    scopes.forEach((scope, index) => {
        validateBounded(`${name} resource_kind`, scope.resourceKind, MAX_KIND_BYTES, true);
        if (previousKind >= scope.resourceKind) {
            throw new WorkContextError(`${name} resource kinds must be sorted and unique`);
        }
        previousKind = scope.resourceKind;
        if (scope.actions.length === 0 ||
            scope.actions.length > MAX_SCOPE_ENTRIES) {
            throw new WorkContextError(`${name}[${index}] actions must contain 1..${MAX_SCOPE_ENTRIES} entries`);
        }
        validateSortedUnique(`${name} actions`, scope.actions, MAX_KIND_BYTES);
        if (scope.resourceIds.length > MAX_SCOPE_ENTRIES) {
            throw new WorkContextError(`${name}[${index}] has too many resource IDs`);
        }
        validateSortedUnique(`${name} resource_ids`, scope.resourceIds, MAX_ID_BYTES);
    });
}
function scopesAttenuate(parent, child) {
    const parentByKind = new Map(parent.map((scope) => [scope.resourceKind, scope]));
    return child.every((scope) => {
        const ancestor = parentByKind.get(scope.resourceKind);
        if (!ancestor || !subset(scope.actions, ancestor.actions))
            return false;
        if (ancestor.resourceIds.length > 0) {
            return (scope.resourceIds.length > 0 &&
                subset(scope.resourceIds, ancestor.resourceIds));
        }
        return true;
    });
}
function subset(child, parent) {
    const allowed = new Set(parent);
    return child.every((value) => allowed.has(value));
}
function canonicalizeWorkContext(source) {
    const context = cloneContext(source);
    context.authorityScopes = canonicalizeScopes(context.authorityScopes);
    context.actorChain = context.actorChain.map((actor) => ({
        ...actor,
        grantedScopes: canonicalizeScopes(actor.grantedScopes),
    }));
    context.attributionTeamIds = sortedUnique(context.attributionTeamIds);
    return context;
}
function canonicalizeScopes(scopes) {
    return scopes
        .map((scope) => ({
        resourceKind: scope.resourceKind,
        actions: sortedUnique(scope.actions),
        resourceIds: sortedUnique(scope.resourceIds),
    }))
        .sort((left, right) => left.resourceKind.localeCompare(right.resourceKind));
}
function cloneContext(context) {
    return {
        ...context,
        authorityScopes: cloneScopes(context.authorityScopes),
        actorChain: cloneActors(context.actorChain),
        attributionTeamIds: [...context.attributionTeamIds],
    };
}
function cloneScopes(scopes) {
    return scopes.map((scope) => ({
        resourceKind: scope.resourceKind,
        actions: [...scope.actions],
        resourceIds: [...scope.resourceIds],
    }));
}
function cloneActor(actor) {
    return {
        principalId: actor.principalId,
        principalKind: actor.principalKind,
        delegationId: actor.delegationId,
        grantedScopes: cloneScopes(actor.grantedScopes),
    };
}
function cloneActors(actors) {
    return actors.map(cloneActor);
}
function sortedUnique(values) {
    return [...new Set(values)].sort();
}
function validateSortedUnique(name, values, maxBytes) {
    let previous = "";
    values.forEach((value, index) => {
        validateBounded(name, value, maxBytes, true);
        if (index > 0 && previous >= value) {
            throw new WorkContextError(`${name} must be sorted and unique`);
        }
        previous = value;
    });
}
function matchExpectations(context, expected) {
    for (const [name, got, wanted] of [
        ["issuer", context.issuer, expected.issuer],
        ["audience", context.audience, expected.audience],
        ["tenant", context.tenantId, expected.tenantId],
        ["owner", context.ownerPrincipalId, expected.ownerPrincipalId],
        ["task", context.taskId, expected.taskId],
        ["session", context.sessionId, expected.sessionId],
    ]) {
        if (wanted !== undefined && wanted !== "" && got !== wanted) {
            throw new WorkContextError(`${name} mismatch`);
        }
    }
    if (expected.parentSessionId !== undefined &&
        (context.parentSessionId ?? null) !== expected.parentSessionId) {
        throw new WorkContextError("parent session mismatch");
    }
    if (expected.authorizationRevision !== undefined &&
        context.authorizationRevision !==
            parseRevision(expected.authorizationRevision)) {
        throw new WorkContextError("authorization revision mismatch");
    }
}
function decodeToken(encoded) {
    validateTokenShape(encoded);
    const [payloadRaw, signatureRaw] = encoded.split(".");
    let payload;
    let signature;
    try {
        payload = Buffer.from(payloadRaw, "base64url");
        signature = Buffer.from(signatureRaw, "base64url");
    }
    catch (error) {
        throw new WorkContextError(`invalid base64url: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (payload.toString("base64url") !== payloadRaw ||
        signature.toString("base64url") !== signatureRaw) {
        throw new WorkContextError("non-canonical base64url");
    }
    if (signature.byteLength !== 64) {
        throw new WorkContextError("signature must be 64 bytes");
    }
    return { payload, signature };
}
function validateTokenShape(encoded) {
    if (!encoded)
        throw new WorkContextError("empty token");
    if (Buffer.byteLength(encoded, "utf8") > exports.WORK_CONTEXT_MAX_TOKEN_BYTES) {
        throw new WorkContextError(`token exceeds ${exports.WORK_CONTEXT_MAX_TOKEN_BYTES} bytes`);
    }
    if (encoded.split(".").length !== 2) {
        throw new WorkContextError("token must have exactly two segments");
    }
}
function parseRevision(value) {
    try {
        const parsed = typeof value === "bigint"
            ? value
            : typeof value === "number"
                ? BigInt(value)
                : BigInt(value);
        if (parsed < 0n || parsed > 18446744073709551615n) {
            throw new Error("outside uint64");
        }
        if (typeof value === "number" && !Number.isSafeInteger(value)) {
            throw new Error("unsafe JavaScript integer; use bigint or decimal string");
        }
        return parsed;
    }
    catch (error) {
        throw new WorkContextError(`authorization_revision must be uint64: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function unixSeconds(value) {
    const millis = value.getTime();
    if (!Number.isFinite(millis))
        throw new WorkContextError("invalid time");
    return Math.floor(millis / 1000);
}
function validateBounded(name, value, maxBytes, required) {
    if (required && value.trim() === "") {
        throw new WorkContextError(`${name} is required`);
    }
    if (Buffer.byteLength(value, "utf8") > maxBytes) {
        throw new WorkContextError(`${name} exceeds ${maxBytes} bytes`);
    }
}
function asPrivateKey(key) {
    if (key instanceof node_crypto_1.KeyObject) {
        if (key.type !== "private") {
            throw new WorkContextError("private key material is not private");
        }
        return key;
    }
    return (0, node_crypto_1.createPrivateKey)(key);
}
function asPublicKey(key) {
    if (key instanceof node_crypto_1.KeyObject) {
        return key.type === "public" ? key : (0, node_crypto_1.createPublicKey)(key);
    }
    try {
        return (0, node_crypto_1.createPublicKey)(key);
    }
    catch {
        return (0, node_crypto_1.createPublicKey)((0, node_crypto_1.createPrivateKey)(key));
    }
}
function exactRecord(value, name, allowedKeys) {
    if (value === null ||
        typeof value !== "object" ||
        Array.isArray(value)) {
        throw new WorkContextError(`${name} must be an object`);
    }
    const record = value;
    const allowed = new Set(allowedKeys);
    for (const key of Object.keys(record)) {
        if (!allowed.has(key)) {
            throw new WorkContextError(`${name} contains unknown field ${key}`);
        }
    }
    return record;
}
function stringValue(value, name) {
    if (typeof value !== "string") {
        throw new WorkContextError(`${name} must be a string`);
    }
    return value;
}
function integerValue(value, name) {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw new WorkContextError(`${name} must be a safe integer`);
    }
    return value;
}
function stringArray(value, name) {
    if (!Array.isArray(value) ||
        value.some((entry) => typeof entry !== "string")) {
        throw new WorkContextError(`${name} must be a string array`);
    }
    return [...value];
}
//# sourceMappingURL=work-context.js.map