"use client";

import type { AppSettings } from "./types";

export default function SettingsTab({
  settings,
  onToggleFeature,
  onToggleRegistration,
  onUpdateLimit,
}: {
  settings: AppSettings;
  onToggleFeature: (feature: keyof AppSettings["features"]) => void;
  onToggleRegistration: (field: keyof AppSettings["registration"]) => void;
  onUpdateLimit: (limits: AppSettings["limits"]) => void;
}) {
  return (
    <div className="mt-6 max-w-lg space-y-8">
      <div>
        <h2 className="text-[15px] font-semibold text-plum">Registration</h2>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.registration.enabled}
              onChange={() => onToggleRegistration("enabled")}
              className="accent-violet"
            />
            <div>
              <p className="text-[15px] text-plum">Allow new signups</p>
              <p className="text-[12px] text-muted">
                Disable to prevent new subscribers from registering
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.registration.invite_only}
              onChange={() => onToggleRegistration("invite_only")}
              className="accent-violet"
            />
            <div>
              <p className="text-[15px] text-plum">Invite only</p>
              <p className="text-[12px] text-muted">
                Only invited users can sign up
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-plum">Feature Flags</h2>
        <div className="mt-3 space-y-3">
          {(
            Object.entries(settings.features) as [
              keyof AppSettings["features"],
              boolean,
            ][]
          ).map(([key, enabled]) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onToggleFeature(key)}
                className="accent-violet"
              />
              <span className="text-[15px] text-plum">
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-plum">Limits</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[12px] text-muted">Max guests per event</label>
            <input
              type="number"
              defaultValue={settings.limits.max_guests}
              onBlur={(e) => {
                onUpdateLimit({ ...settings.limits, max_guests: Number(e.target.value) });
              }}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted">Max AI chat messages per hour</label>
            <input
              type="number"
              defaultValue={settings.limits.max_chat_messages_per_hour}
              onBlur={(e) => {
                onUpdateLimit({ ...settings.limits, max_chat_messages_per_hour: Number(e.target.value) });
              }}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted">Max file size (MB)</label>
            <input
              type="number"
              defaultValue={settings.limits.max_file_size_mb}
              onBlur={(e) => {
                onUpdateLimit({ ...settings.limits, max_file_size_mb: Number(e.target.value) });
              }}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
