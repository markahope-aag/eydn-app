"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

type TemplateSummary = {
  slug: string;
  category: string;
  description: string | null;
  subject: string;
  variables: string[];
  enabled: boolean;
  updated_at: string | null;
};

type TemplateFull = TemplateSummary & {
  html: string;
};

type SequenceStep = {
  sequence_slug: string;
  step_order: number;
  template_slug: string;
  offset_days: number;
  audience_filter: Record<string, unknown>;
  enabled: boolean;
};

type SequenceWithSteps = {
  slug: string;
  description: string | null;
  trigger_event: string;
  audience_filter: Record<string, unknown>;
  enabled: boolean;
  steps: SequenceStep[];
  sentLast30d: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  transactional: "Transactional",
  lifecycle: "Lifecycle",
  marketing: "Marketing",
  nurture: "Nurture",
};

export default function EmailSequencesPage() {
  const [sequences, setSequences] = useState<SequenceWithSteps[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<TemplateFull | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/email/sequences").then((r) => (r.ok ? r.json() : { sequences: [] })),
      fetch("/api/admin/email/templates").then((r) => (r.ok ? r.json() : { templates: [] })),
    ])
      .then(([seq, tmpl]) => {
        setSequences(seq.sequences || []);
        setTemplates(tmpl.templates || []);
      })
      .catch(() => toast.error("Failed to load email data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function openTemplate(slug: string) {
    try {
      const r = await fetch(`/api/admin/email/templates/${slug}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setEditingTemplate(data.template);
    } catch {
      toast.error("Failed to load template");
    }
  }

  async function saveStep(step: SequenceStep, patch: Partial<SequenceStep>) {
    try {
      const r = await fetch(
        `/api/admin/email/sequences/${step.sequence_slug}/steps/${step.step_order}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (!r.ok) throw new Error();
      toast.success("Step updated");
      reload();
    } catch {
      toast.error("Failed to update step");
    }
  }

  if (loading && sequences.length === 0 && templates.length === 0) {
    return <p className="text-[15px] text-muted py-8">Loading...</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1>Email Sequences</h1>
        <p className="mt-2 text-[15px] text-muted max-w-2xl">
          Sequences are ordered series of email steps fired by cron jobs against an
          anchor date (trial start, wedding date, etc.). Edit the step offsets or
          swap which template a step uses without redeploying.
        </p>
      </div>

      <section>
        <h2 className="mb-4">Sequences</h2>
        <div className="flex flex-col gap-6">
          {sequences.map((seq) => (
            <div key={seq.slug} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px]">{seq.slug}</h3>
                  <p className="mt-1 text-[14px] text-muted">{seq.description}</p>
                  <div className="mt-2 flex gap-3 text-[12px] text-muted">
                    <span>
                      Trigger: <code className="bg-lavender px-1.5 py-0.5 rounded">{seq.trigger_event}</code>
                    </span>
                    <span>·</span>
                    <span>Sent in last 30d: {seq.sentLast30d}</span>
                    <span>·</span>
                    <span className={seq.enabled ? "text-confirmed-text" : "text-declined-text"}>
                      {seq.enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-muted border-b border-border">
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Template</th>
                      <th className="pb-2 pr-3">Offset (days)</th>
                      <th className="pb-2 pr-3">Audience filter</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {seq.steps.map((step) => (
                      <StepRow
                        key={step.step_order}
                        step={step}
                        onSave={(patch) => saveStep(step, patch)}
                        onOpenTemplate={openTemplate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4">Templates</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.slug} className="border-b border-border last:border-0 hover:bg-whisper">
                  <td className="px-4 py-3 font-medium">{t.slug}</td>
                  <td className="px-4 py-3 text-muted">{CATEGORY_LABELS[t.category] || t.category}</td>
                  <td className="px-4 py-3 text-muted truncate max-w-md" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className={`px-4 py-3 ${t.enabled ? "text-confirmed-text" : "text-declined-text"}`}>
                    {t.enabled ? "enabled" : "disabled"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openTemplate(t.slug)} className="btn-secondary btn-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => {
            setEditingTemplate(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function StepRow({
  step,
  onSave,
  onOpenTemplate,
}: {
  step: SequenceStep;
  onSave: (patch: Partial<SequenceStep>) => void;
  onOpenTemplate: (slug: string) => void;
}) {
  const [offsetDays, setOffsetDays] = useState(String(step.offset_days));
  const [enabled, setEnabled] = useState(step.enabled);
  const dirty =
    offsetDays !== String(step.offset_days) || enabled !== step.enabled;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-3 font-medium">{step.step_order}</td>
      <td className="py-2 pr-3">
        <button
          onClick={() => onOpenTemplate(step.template_slug)}
          className="text-violet underline-offset-2 hover:underline text-left"
        >
          {step.template_slug}
        </button>
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          value={offsetDays}
          onChange={(e) => setOffsetDays(e.target.value)}
          className="w-24"
        />
      </td>
      <td className="py-2 pr-3 text-muted text-[12px] font-mono">
        {Object.keys(step.audience_filter).length === 0
          ? "—"
          : JSON.stringify(step.audience_filter)}
      </td>
      <td className="py-2 pr-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className={enabled ? "text-confirmed-text" : "text-muted"}>
            {enabled ? "on" : "off"}
          </span>
        </label>
      </td>
      <td className="py-2 text-right">
        {dirty && (
          <button
            onClick={() =>
              onSave({
                offset_days: Number.parseInt(offsetDays, 10),
                enabled,
              })
            }
            className="btn-primary btn-sm"
          >
            Save
          </button>
        )}
      </td>
    </tr>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: TemplateFull;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [html, setHtml] = useState(template.html);
  const [enabled, setEnabled] = useState(template.enabled);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testTo, setTestTo] = useState("");
  const dirty =
    subject !== template.subject || html !== template.html || enabled !== template.enabled;

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/email/templates/${template.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html, enabled }),
      });
      if (!r.ok) throw new Error();
      toast.success("Template saved");
      onSaved();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setSending(true);
    try {
      const body: Record<string, string> = {};
      if (testTo.trim()) body.to = testTo.trim();
      const r = await fetch(`/api/admin/email/templates/${template.slug}/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        toast.success("Test email sent");
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch {
      toast.error("Send request failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-plum/50 flex items-start justify-center overflow-y-auto p-6">
      <div className="bg-surface rounded-2xl max-w-4xl w-full my-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-[18px]">{template.slug}</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {CATEGORY_LABELS[template.category] || template.category} ·
              vars: {template.variables.length === 0 ? "none" : template.variables.join(", ")}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm">Close</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="tmpl-subject">Subject</label>
            <input
              id="tmpl-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="tmpl-html">HTML body</label>
            <textarea
              id="tmpl-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={18}
              className="w-full mt-1.5 font-mono text-[12px]"
            />
            <p className="mt-1.5 text-[12px] text-muted">
              Use <code>{"{{varName}}"}</code> placeholders. Wrapper chrome (header gradient,
              footer) is added by the runner — only edit the body content here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="tmpl-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="tmpl-enabled" className="font-normal">Enabled (cron will send this template)</label>
          </div>
          <details className="border border-border rounded-lg p-3">
            <summary className="cursor-pointer text-[14px] font-medium">Live preview</summary>
            <div className="mt-3 p-4 bg-whisper rounded-md">
              <p className="text-[12px] text-muted mb-2">Subject: {subject}</p>
              <div
                className="email-preview text-[14px]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </details>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 bg-whisper">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="email"
              placeholder="(your email)"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="flex-1 max-w-xs"
            />
            <button onClick={sendTest} disabled={sending} className="btn-secondary btn-sm">
              {sending ? "Sending..." : "Send test"}
            </button>
          </div>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="btn-primary btn-sm"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
