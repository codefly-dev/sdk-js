export type SettingPath = readonly [string, ...string[]];
export type DeepPartial<T> = T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;
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
export declare function settingKey<Root, Value>(path: SettingPath | string, options?: SettingKeyOptions<Value>): SettingKey<Root, Value>;
export declare function getSetting<Root, Value>(root: Root | null | undefined, key: SettingKey<Root, Value>): Value | undefined;
export declare function setSetting<Root extends object, Value>(key: SettingKey<Root, Value>, value: Value): DeepPartial<Root>;
export declare function settingUpdate<Root extends object, Value>(key: SettingKey<Root, Value>, value: Value): SettingUpdate<Root, Value>;
export declare function setSettings<Root extends object>(...updates: ReadonlyArray<SettingUpdate<Root, unknown>>): DeepPartial<Root>;
export declare function assignSetting<Root extends object, Value>(root: Root, key: SettingKey<Root, Value>, value: Value): Root;
export declare function mergeSettingPatch<Root extends object>(root: Root, patch: DeepPartial<Root>): Root;
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
export declare function createSettingsStore<Root extends object>({ get, patch, }: SettingsStoreOptions<Root>): SettingsStore<Root>;
export declare const settings: {
    Key: typeof settingKey;
    Get: typeof getSetting;
    Set: typeof setSetting;
    Update: typeof settingUpdate;
    Patch: typeof setSettings;
    Assign: typeof assignSetting;
    Merge: typeof mergeSettingPatch;
    Store: typeof createSettingsStore;
};
//# sourceMappingURL=settings.d.ts.map