"use client";

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useRef } from "react";

type NoteEditorProps = {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
};

export default function NoteEditor({
  initialMarkdown,
  onChange,
}: NoteEditorProps) {
  const initialized = useRef(false);
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (initialMarkdown.trim()) {
      const blocks = editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
    }

    initialized.current = true;
  }, [editor, initialMarkdown]);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      onChange={(currentEditor) => {
        if (!initialized.current) return;
        onChange(currentEditor.blocksToMarkdownLossy());
      }}
      className="min-h-72"
    />
  );
}
