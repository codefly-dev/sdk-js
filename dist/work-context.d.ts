import { KeyObject } from "node:crypto";
export type WorkContextKeyLike = KeyObject | string | Buffer;
export declare const WORK_CONTEXT_HEADER_NAME = "x-codefly-work-context";
export declare const WORK_CONTEXT_TYPE = "codefly.work-context/v1";
export declare const WORK_CONTEXT_ALGORITHM = "Ed25519";
export declare const WORK_CONTEXT_REPLAY_IDEMPOTENT = "idempotent";
export declare const WORK_CONTEXT_REPLAY_SINGLE_USE = "single-use";
export declare const WORK_CONTEXT_MAX_ACTOR_DEPTH = 16;
export declare const WORK_CONTEXT_MAX_TOKEN_BYTES: number;
export declare const WORK_CONTEXT_DEFAULT_TTL_SECONDS: number;
export declare const WORK_CONTEXT_MAX_TTL_SECONDS: number;
export declare const WORK_CONTEXT_CLOCK_SKEW_SECONDS = 60;
export type WorkContextReplayPolicy = typeof WORK_CONTEXT_REPLAY_IDEMPOTENT | typeof WORK_CONTEXT_REPLAY_SINGLE_USE;
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
export declare class WorkContextError extends Error {
    constructor(message: string);
}
/** Opaque signed capability. Use attachWorkContext for HTTP propagation. */
export declare class WorkContextToken {
    #private;
    private constructor();
    encoded(): string;
    static parse(encoded: string): WorkContextToken;
    static signed(encoded: string): WorkContextToken;
}
export declare function parseWorkContextToken(encoded: string): WorkContextToken;
/** Installs the SDK-owned Work Context carrier on a Headers object. */
export declare function attachWorkContext(headers: WorkContextHeaders, token: WorkContextToken): void;
/** Returns fetch options with the signed context attached. */
export declare function withWorkContext(init: RequestInit, token: WorkContextToken): RequestInit;
/** Extracts an opaque token. This does not verify it. */
export declare function workContextFromHeaders(headers: WorkContextHeaders): WorkContextToken;
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
export declare class WorkContextSigner {
    #private;
    constructor(options: WorkContextSignerOptions);
    startTask(input: StartTaskInput): {
        token: WorkContextToken;
        context: WorkContextV1;
    };
    startSession(parent: WorkContextToken, input: StartSessionInput): {
        token: WorkContextToken;
        context: WorkContextV1;
    };
    startChildSession(parent: WorkContextToken, input: StartChildSessionInput): {
        token: WorkContextToken;
        context: WorkContextV1;
    };
}
export interface WorkContextVerifierOptions {
    publicKeys: ReadonlyMap<string, WorkContextKeyLike> | Record<string, WorkContextKeyLike>;
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
export declare class WorkContextVerifier {
    #private;
    constructor(options: WorkContextVerifierOptions);
    verify(token: WorkContextToken, expected?: WorkContextExpectations): WorkContextV1;
}
//# sourceMappingURL=work-context.d.ts.map