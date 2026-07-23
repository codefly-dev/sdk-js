"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
exports.settingKey = settingKey;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.settingUpdate = settingUpdate;
exports.setSettings = setSettings;
exports.assignSetting = assignSetting;
exports.mergeSettingPatch = mergeSettingPatch;
exports.createSettingsStore = createSettingsStore;
function settingKey(path, options = {}) {
    const parts = typeof path === "string" ? path.split(".") : [...path];
    const [first, ...rest] = parts;
    if (!first || rest.some((part) => part.length === 0)) {
        throw new Error("setting path must contain at least one non-empty segment");
    }
    return {
        path: [first, ...rest],
        defaultValue: options.defaultValue,
    };
}
function getSetting(root, key) {
    let current = root;
    for (const part of key.path) {
        if (current === null ||
            current === undefined ||
            typeof current !== "object") {
            return key.defaultValue;
        }
        current = current[part];
    }
    return current === undefined ? key.defaultValue : current;
}
function setSetting(key, value) {
    const root = {};
    let cursor = root;
    key.path.forEach((part, index) => {
        if (index === key.path.length - 1) {
            cursor[part] = value;
            return;
        }
        const next = {};
        cursor[part] = next;
        cursor = next;
    });
    return root;
}
function settingUpdate(key, value) {
    return { key, value };
}
function setSettings(...updates) {
    let patch = {};
    for (const update of updates) {
        patch = mergeSettingPatch(patch, setSetting(update.key, update.value));
    }
    return patch;
}
function assignSetting(root, key, value) {
    return mergeSettingPatch(root, setSetting(key, value));
}
function mergeSettingPatch(root, patch) {
    return mergeObjects(root, patch);
}
function createSettingsStore({ get, patch, }) {
    return {
        async Get(key) {
            return getSetting(await get(), key);
        },
        Set(key, value) {
            return patch(setSetting(key, value));
        },
        Patch(first, ...rest) {
            if (isSettingUpdate(first)) {
                return patch(setSettings(first, ...rest));
            }
            return patch(first);
        },
    };
}
function mergeObjects(base, patch) {
    if (!isPlainObject(base) || !isPlainObject(patch)) {
        return patch;
    }
    const out = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        out[key] = mergeObjects(out[key], value);
    }
    return out;
}
function isPlainObject(value) {
    return (value !== null &&
        typeof value === "object" &&
        !Array.isArray(value));
}
function isSettingUpdate(value) {
    return (isPlainObject(value) &&
        isPlainObject(value.key) &&
        Array.isArray(value.key.path) &&
        "value" in value);
}
exports.settings = {
    Key: settingKey,
    Get: getSetting,
    Set: setSetting,
    Update: settingUpdate,
    Patch: setSettings,
    Assign: assignSetting,
    Merge: mergeSettingPatch,
    Store: createSettingsStore,
};
//# sourceMappingURL=settings.js.map