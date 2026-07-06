export type SettingPath = readonly [string, ...string[]];

export type DeepPartial<T> = T extends object
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : T;

export interface SettingKey<Root, Value> {
  readonly path: SettingPath;
  readonly defaultValue?: Value;
  readonly __root?: Root;
  readonly __value?: Value;
}

export interface SettingKeyOptions<Value> {
  defaultValue?: Value;
}

export interface SettingUpdate<Root extends object, Value> {
  readonly key: SettingKey<Root, Value>;
  readonly value: Value;
}

export function settingKey<Root, Value>(
  path: SettingPath | string,
  options: SettingKeyOptions<Value> = {},
): SettingKey<Root, Value> {
  const parts: string[] =
    typeof path === "string" ? path.split(".") : [...path];
  const [first, ...rest] = parts;
  if (!first || rest.some((part) => part.length === 0)) {
    throw new Error("setting path must contain at least one non-empty segment");
  }
  return {
    path: [first, ...rest],
    defaultValue: options.defaultValue,
  };
}

export function getSetting<Root, Value>(
  root: Root | null | undefined,
  key: SettingKey<Root, Value>,
): Value | undefined {
  let current: unknown = root;
  for (const part of key.path) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return key.defaultValue;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current === undefined ? key.defaultValue : (current as Value);
}

export function setSetting<Root extends object, Value>(
  key: SettingKey<Root, Value>,
  value: Value,
): DeepPartial<Root> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  key.path.forEach((part, index) => {
    if (index === key.path.length - 1) {
      cursor[part] = value;
      return;
    }
    const next: Record<string, unknown> = {};
    cursor[part] = next;
    cursor = next;
  });
  return root as DeepPartial<Root>;
}

export function settingUpdate<Root extends object, Value>(
  key: SettingKey<Root, Value>,
  value: Value,
): SettingUpdate<Root, Value> {
  return { key, value };
}

export function setSettings<Root extends object>(
  ...updates: ReadonlyArray<SettingUpdate<Root, unknown>>
): DeepPartial<Root> {
  let patch = {} as DeepPartial<Root>;
  for (const update of updates) {
    patch = mergeSettingPatch(
      patch as Root,
      setSetting(update.key, update.value),
    ) as DeepPartial<Root>;
  }
  return patch;
}

export function assignSetting<Root extends object, Value>(
  root: Root,
  key: SettingKey<Root, Value>,
  value: Value,
): Root {
  return mergeSettingPatch(root, setSetting(key, value));
}

export function mergeSettingPatch<Root extends object>(
  root: Root,
  patch: DeepPartial<Root>,
): Root {
  return mergeObjects(root, patch) as Root;
}

export interface SettingsStore<Root extends object> {
  Get<Value>(key: SettingKey<Root, Value>): Promise<Value | undefined>;
  Set<Value>(key: SettingKey<Root, Value>, value: Value): Promise<Root>;
  Patch(...updates: ReadonlyArray<SettingUpdate<Root, unknown>>): Promise<Root>;
  Patch(patch: DeepPartial<Root>): Promise<Root>;
}

export interface SettingsStoreOptions<Root extends object> {
  get: () => Promise<Root>;
  patch: (patch: DeepPartial<Root>) => Promise<Root>;
}

export function createSettingsStore<Root extends object>({
  get,
  patch,
}: SettingsStoreOptions<Root>): SettingsStore<Root> {
  return {
    async Get<Value>(key: SettingKey<Root, Value>) {
      return getSetting(await get(), key);
    },
    Set<Value>(key: SettingKey<Root, Value>, value: Value) {
      return patch(setSetting(key, value));
    },
    Patch(
      first:
        | DeepPartial<Root>
        | SettingUpdate<Root, unknown>,
      ...rest: ReadonlyArray<SettingUpdate<Root, unknown>>
    ) {
      if (isSettingUpdate(first)) {
        return patch(setSettings(first, ...rest));
      }
      return patch(first);
    },
  };
}

function mergeObjects(base: unknown, patch: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch;
  }

  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = mergeObjects(out[key], value);
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isSettingUpdate<Root extends object>(
  value: unknown,
): value is SettingUpdate<Root, unknown> {
  return (
    isPlainObject(value) &&
    isPlainObject(value.key) &&
    Array.isArray(value.key.path) &&
    "value" in value
  );
}

export const settings = {
  Key: settingKey,
  Get: getSetting,
  Set: setSetting,
  Update: settingUpdate,
  Patch: setSettings,
  Assign: assignSetting,
  Merge: mergeSettingPatch,
  Store: createSettingsStore,
};
