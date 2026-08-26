"use client";

import { useState } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import {
  DEFAULT_PROMPT_PREFERENCES,
  DocumentFormat,
  PromptPreferences,
  applyDocumentFormat,
  buildQAPrompt,
  buildSummaryPrompt,
  mergePromptPreferences,
} from "@/lib/prompt_preferences";

type Scope = "library" | "document";

type AISettingsButtonProps = {
  scope: Scope;
  documentId?: string;
  preferences?: PromptPreferences;
  onPreferencesChange?: (preferences: PromptPreferences) => void;
};

type PromptSuggestion = {
  preferences: Partial<PromptPreferences>;
  reason: string;
};

const DOCUMENT_FORMATS: Array<{ value: DocumentFormat; label: string }> = [
  { value: "slides", label: "簡報" },
  { value: "paper", label: "論文" },
  { value: "textbook", label: "課本" },
  { value: "exam", label: "考題" },
  { value: "custom", label: "自訂" },
];

export default function AISettingsButton({
  scope,
  documentId,
  preferences,
  onPreferencesChange,
}: AISettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PromptPreferences>(
    () => preferences ?? DEFAULT_PROMPT_PREFERENCES,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [applyingLatest, setApplyingLatest] = useState(false);
  const [suggestionReason, setSuggestionReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const summaryPrompt = buildSummaryPrompt(draft);
  const qaPrompt = buildQAPrompt(draft);

  const isLibrary = scope === "library";
  const buttonLabel = isLibrary ? "一般設定" : "AI Settings";

  async function openSettings() {
    setSuggestionReason("");
    setNotice("");
    setError("");
    setOpen(true);

    if (isLibrary) {
      // Library defaults live in the DB; load the latest before editing.
      setLoading(true);
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (response.ok && data.preferences) {
          setDraft(mergePromptPreferences(data.preferences));
        } else {
          setDraft(DEFAULT_PROMPT_PREFERENCES);
        }
      } catch {
        setError("無法載入一般設定");
      } finally {
        setLoading(false);
      }
    } else {
      setDraft(preferences ?? DEFAULT_PROMPT_PREFERENCES);
    }
  }

  function updateDraft(value: Partial<PromptPreferences>) {
    setDraft((current) => ({ ...current, ...value }));
  }

  function chooseFormat(format: DocumentFormat) {
    setDraft((current) => applyDocumentFormat(current, format));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const endpoint = isLibrary
      ? "/api/settings"
      : `/api/documents/${documentId}/preferences`;

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: draft }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "儲存失敗");
        return;
      }
      onPreferencesChange?.(draft);
      setOpen(false);
    } catch {
      setError("網路錯誤，無法儲存設定");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft(DEFAULT_PROMPT_PREFERENCES);
    setSuggestionReason("");
    setNotice("");
  }

  async function handleApplyLibraryDefaults() {
    setApplyingLatest(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (response.ok && data.preferences) {
        setDraft(mergePromptPreferences(data.preferences));
        setNotice("已帶入最新的一般設定，記得按「儲存」套用到這份文件。");
      } else {
        setError("無法載入一般設定");
      }
    } catch {
      setError("網路錯誤，無法載入一般設定");
    } finally {
      setApplyingLatest(false);
    }
  }

  async function handleSuggestFromPDF() {
    if (!documentId) return;

    setSuggesting(true);
    setError("");
    setSuggestionReason("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/prompt-suggestions`,
      );
      const data: PromptSuggestion | { error?: string; code?: string } =
        await response.json();

      if (!response.ok) {
        if ("code" in data && data.code === "MONTHLY_AI_LIMIT") {
          setError("本月 100 次免費 AI 使用額度已用完，將於下個月重置。");
          return;
        }
        setError(
          "error" in data
            ? data.error || "Failed to suggest settings"
            : "Failed to suggest settings",
        );
        return;
      }

      if ("preferences" in data) {
        setDraft((current) =>
          mergePromptPreferences({ ...current, ...data.preferences }),
        );
        setSuggestionReason(data.reason);
      }
    } catch {
      setError("網路錯誤，無法產生建議設定");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void openSettings()}
        className="inline-flex h-9 items-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={buttonLabel}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
          >
            <header className="border-b border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isLibrary ? "一般設定" : "AI Settings"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {isLibrary
                      ? "這些是整個 library 的預設值，會套用到之後上傳的新文件。"
                      : "調整這份文件的 AI 摘要與問答方式。"}
                  </p>
                </div>
                {!isLibrary && documentId && (
                  <button
                    type="button"
                    onClick={handleSuggestFromPDF}
                    disabled={suggesting}
                    className="inline-flex h-9 items-center gap-2 rounded bg-amber-100 px-3 text-sm font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {suggesting ? "分析中..." : "由 PDF 建議"}
                  </button>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="text-sm text-gray-500">載入設定中…</p>
              ) : (
                <>
                  {!isLibrary && (
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-gray-900">
                        文件格式
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          選擇後會自動套用建議的口吻與摘要格式，仍可再手動調整
                        </span>
                      </legend>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {DOCUMENT_FORMATS.map((format) => (
                          <SegmentButton
                            key={format.value}
                            active={draft.documentFormat === format.value}
                            onClick={() => chooseFormat(format.value)}
                          >
                            {format.label}
                          </SegmentButton>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-gray-900">
                        Tone
                      </legend>
                      <SegmentButton
                        active={draft.tone === "detailed"}
                        onClick={() => updateDraft({ tone: "detailed" })}
                      >
                        詳細
                      </SegmentButton>
                      <SegmentButton
                        active={draft.tone === "concise"}
                        onClick={() => updateDraft({ tone: "concise" })}
                      >
                        簡潔
                      </SegmentButton>
                      <SegmentButton
                        active={draft.tone === "teaching"}
                        onClick={() => updateDraft({ tone: "teaching" })}
                      >
                        教學語氣
                      </SegmentButton>
                    </fieldset>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-gray-900">
                        Language
                      </legend>
                      <SegmentButton
                        active={draft.language === "zh-TW"}
                        onClick={() => updateDraft({ language: "zh-TW" })}
                      >
                        中文
                      </SegmentButton>
                      <SegmentButton
                        active={draft.language === "en"}
                        onClick={() => updateDraft({ language: "en" })}
                      >
                        English
                      </SegmentButton>
                    </fieldset>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-gray-900">
                        Summary format
                      </legend>
                      <SegmentButton
                        active={draft.summaryFormat === "bullets"}
                        onClick={() => updateDraft({ summaryFormat: "bullets" })}
                      >
                        條列式
                      </SegmentButton>
                      <SegmentButton
                        active={draft.summaryFormat === "full"}
                        onClick={() => updateDraft({ summaryFormat: "full" })}
                      >
                        完整說明
                      </SegmentButton>
                      <SegmentButton
                        active={draft.summaryFormat === "exam"}
                        onClick={() => updateDraft({ summaryFormat: "exam" })}
                      >
                        考前重點整理
                      </SegmentButton>
                    </fieldset>
                  </div>

                  <label className="block text-sm font-semibold text-gray-900">
                    Extra instructions
                    <textarea
                      value={draft.extraInstructions}
                      onChange={(event) =>
                        updateDraft({ extraInstructions: event.target.value })
                      }
                      placeholder="例如：保留英文術語、用初學者能懂的方式解釋、回答時多舉例..."
                      className="mt-2 min-h-24 w-full rounded border border-gray-300 p-3 text-sm font-normal outline-none focus:border-blue-500"
                    />
                  </label>

                  {!isLibrary && (
                    <button
                      type="button"
                      onClick={() => void handleApplyLibraryDefaults()}
                      disabled={applyingLatest}
                      className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
                    >
                      {applyingLatest ? "載入中…" : "套用最新的一般設定"}
                    </button>
                  )}

                  {notice && (
                    <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      {notice}
                    </p>
                  )}
                  {suggestionReason && (
                    <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {suggestionReason}
                    </p>
                  )}
                  {error && (
                    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <section className="rounded border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((current) => !current)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-gray-900"
                    >
                      Advanced prompt editor
                      <span className="text-xs font-normal text-gray-500">
                        {advancedOpen ? "Hide" : "Show"}
                      </span>
                    </button>

                    {advancedOpen && (
                      <div className="space-y-4 border-t border-gray-200 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <input
                            type="checkbox"
                            checked={draft.useCustomSummaryPrompt}
                            onChange={(event) =>
                              updateDraft({
                                useCustomSummaryPrompt: event.target.checked,
                              })
                            }
                          />
                          Use custom summary prompt
                        </label>
                        <PromptTextarea
                          label="Summary system prompt"
                          value={draft.customSummarySystemPrompt}
                          onChange={(value) =>
                            updateDraft({ customSummarySystemPrompt: value })
                          }
                        />
                        <PromptTextarea
                          label="Summary user prompt template"
                          value={draft.customSummaryUserPrompt}
                          onChange={(value) =>
                            updateDraft({ customSummaryUserPrompt: value })
                          }
                          hint="Available variable: {{pageText}}"
                        />

                        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <input
                            type="checkbox"
                            checked={draft.useCustomQAPrompt}
                            onChange={(event) =>
                              updateDraft({
                                useCustomQAPrompt: event.target.checked,
                              })
                            }
                          />
                          Use custom Q&A prompt
                        </label>
                        <PromptTextarea
                          label="Q&A system prompt"
                          value={draft.customQASystemPrompt}
                          onChange={(value) =>
                            updateDraft({ customQASystemPrompt: value })
                          }
                        />
                        <PromptTextarea
                          label="Q&A user prompt template"
                          value={draft.customQAUserPrompt}
                          onChange={(value) =>
                            updateDraft({ customQAUserPrompt: value })
                          }
                          hint="Available variables: {{pageText}}, {{selectedText}}, {{question}}"
                        />

                        <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">
                          <p className="font-semibold text-gray-700">
                            Generated summary system prompt preview
                          </p>
                          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
                            {summaryPrompt.systemPrompt}
                          </pre>
                          <p className="mt-3 font-semibold text-gray-700">
                            Generated Q&A system prompt preview
                          </p>
                          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
                            {qaPrompt.systemPrompt}
                          </pre>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <footer className="flex justify-between gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || saving}
                className="h-9 rounded border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Reset
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="h-9 rounded border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={loading || saving}
                  className="h-9 rounded bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "儲存中…" : "Save"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

type SegmentButtonProps = {
  active: boolean;
  children: string;
  onClick: () => void;
};

function SegmentButton({ active, children, onClick }: SegmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block h-9 w-full rounded border px-3 text-left text-sm ${
        active
          ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
          : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

type PromptTextareaProps = {
  label: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
};

function PromptTextarea({ label, value, hint, onChange }: PromptTextareaProps) {
  return (
    <label className="block text-sm font-medium text-gray-900">
      {label}
      {hint && (
        <span className="ml-2 text-xs font-normal text-gray-500">{hint}</span>
      )}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full rounded border border-gray-300 p-3 font-mono text-xs font-normal outline-none focus:border-blue-500"
      />
    </label>
  );
}
