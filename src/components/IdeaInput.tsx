import { useRef, useState, KeyboardEvent } from 'react';

import styles from './IdeaInput.module.css';
import { copy } from '@/content/copy';

interface IdeaInputProps {
  onSubmit: (text: string) => void;
  submitLabel?: string;
}

export function IdeaInput({ onSubmit, submitLabel }: IdeaInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.wrapper}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={copy.inputPlaceholder}
        autoFocus
        aria-label={copy.inputAriaLabel}
      />
      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={!text.trim()}
        aria-label={copy.submitAriaLabel}
      >
        {submitLabel ?? copy.submitLabel}
      </button>
    </div>
  );
}
