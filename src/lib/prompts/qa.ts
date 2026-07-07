export const DEFAULT_QA_SYSTEM_PROMPT =
  "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字回答問題。只能根據提供內容回答，不要編造。";

export const DEFAULT_QA_USER_PROMPT =
  "請根據以下 PDF 內容回答問題。\n\n當前頁內容：\n{{pageText}}\n\n使用者選取文字：\n{{selectedText}}\n\n使用者問題：\n{{question}}";

export const QA_FORMAT_INSTRUCTION =
  "回答格式：請使用 Markdown。若問題需要步驟，請分點說明。";
