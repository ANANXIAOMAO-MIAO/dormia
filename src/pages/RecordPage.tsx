import { KeyboardEvent, useState } from 'react';

import styles from './RecordPage.module.css';
import { copy } from '@/content/copy';
import { useIdeasStore } from '@/store/useIdeasStore';
import { generateEmpathy } from '@/ai/empathy';
import { generateKeyword } from '@/ai/keyword';
import { assignCluster } from '@/ai/clustering';

interface RecordPageProps {
  onBack: () => void;
  onSubmitSuccess: (ideaId: string) => void;
}

export function RecordPage({ onBack, onSubmitSuccess }: RecordPageProps) {
  const { addIdea, updateIdea, upsertCluster, relayoutUniverse } = useIdeasStore();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBack = () => {
    setText('');
    setError(null);
    onBack();
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const idea = await addIdea(trimmed);
      setText('');
      onSubmitSuccess(idea.id);

      void (async () => {
        try {
          const keyword = await generateKeyword(trimmed);
          await updateIdea(idea.id, {
            keyword,
            keywordGeneratedAt: Date.now(),
          });
        } catch {
          // 静默降级
        }
      })();

      void (async () => {
        try {
          const response = await generateEmpathy(trimmed);
          if (response) {
            await updateIdea(idea.id, {
              aiResponse: response,
              aiResponseGeneratedAt: Date.now(),
            });
          }
        } catch {
          // 静默降级
        }
      })();

      void (async () => {
        try {
          const latestClusters = useIdeasStore.getState().clusters;
          const result = await assignCluster(trimmed, latestClusters);
          if (result) {
            if (result.newCluster) {
              await upsertCluster(result.newCluster);
            }
            await updateIdea(idea.id, { clusterId: result.clusterId });
          }
        } catch {
          // 静默降级
        } finally {
          try {
            await relayoutUniverse();
          } catch {
            // 静默降级
          }
        }
      })();
    } catch {
      setError(copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.backIcon}`}
          onClick={handleBack}
          aria-label={copy.recordBackLabel}
        >
          ←
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.submitIcon}`}
          onClick={() => {
            void submit();
          }}
          disabled={!text.trim() || submitting}
          aria-label={copy.composeSubmitLabel}
        >
          ✓
        </button>
        <textarea
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={copy.composeInputAriaLabel}
          placeholder={copy.composeInputPlaceholder}
          autoFocus
        />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
