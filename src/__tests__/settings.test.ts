import {
  createSettingsStore,
  getSetting,
  settingKey,
  settings,
  setSetting,
} from "../settings";

interface UserPreferences {
  user?: {
    email?: string;
    notifications?: {
      inApp?: boolean;
      sound?: boolean;
    };
  };
}

const preference = {
  User: {
    Email: settingKey<UserPreferences, string>("user.email"),
    InAppNotifications: settingKey<UserPreferences, boolean>(
      "user.notifications.inApp",
      { defaultValue: true },
    ),
    Sound: settings.Key<UserPreferences, boolean>(
      ["user", "notifications", "sound"],
      { defaultValue: false },
    ),
  },
};

describe("settings", () => {
  it("creates a nested patch from a typed key", () => {
    expect(setSetting(preference.User.Email, "foo@me.com")).toEqual({
      user: { email: "foo@me.com" },
    });
    expect(settings.Set(preference.User.InAppNotifications, false)).toEqual({
      user: { notifications: { inApp: false } },
    });
    expect(
      settings.Patch(
        settings.Update(preference.User.Email, "foo@me.com"),
        settings.Update(preference.User.Sound, true),
      ),
    ).toEqual({
      user: {
        email: "foo@me.com",
        notifications: { sound: true },
      },
    });
  });

  it("reads nested values and returns defaults for missing keys", () => {
    const prefs: UserPreferences = {
      user: { email: "foo@me.com" },
    };

    expect(getSetting(prefs, preference.User.Email)).toBe("foo@me.com");
    expect(settings.Get(prefs, preference.User.InAppNotifications)).toBe(true);
    expect(settings.Get(prefs, preference.User.Sound)).toBe(false);
  });

  it("backs an async settings store", async () => {
    let state: UserPreferences = {};
    const store = createSettingsStore<UserPreferences>({
      get: async () => state,
      patch: async (patch) => {
        state = settings.Merge(state, patch);
        return state;
      },
    });

    await store.Patch(
      settings.Update(preference.User.Email, "foo@me.com"),
      settings.Update(preference.User.Sound, true),
    );

    await expect(store.Get(preference.User.Email)).resolves.toBe("foo@me.com");
    expect(state).toEqual({
      user: {
        email: "foo@me.com",
        notifications: { sound: true },
      },
    });
  });
});
