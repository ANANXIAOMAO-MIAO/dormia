import { useState, useEffect } from 'react';

import styles from './IdeaDetailCard.module.css';
import type { Idea } from '@/data/types';
import { copy } from '@/content/copy';

interface IdeaDetailCardProps {
  idea: Idea;
  onClose: () => void;
  onAddComment: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export function IdeaDetailCard({ idea, onClose, onAddComment, onDelete }: IdeaDetailCardProps) {
  const [commentText, setCommentText] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // 点击遮罩关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(idea.id, trimmed);
    setCommentText('');
    setSheetOpen(false);
  };

  const handleDelete = () => {
    onDelete(idea.id);
  };

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sheetOpen) {
        setSheetOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, sheetOpen]);

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.card} role="dialog" aria-modal="true">
        <button className={styles.closeBtn} onClick={onClose} aria-label={copy.closeAriaLabel}>
          ×
        </button>

        <p className={styles.text}>{idea.text}</p>

        <p className={styles.aiResponse}>{idea.aiResponse || ''}</p>

        <div className={styles.commentsPanel}>
          <p className={styles.commentsTitle}>{copy.commentsTitle}</p>
          {idea.comments.length === 0 ? (
            <p className={styles.commentsEmpty}>{copy.commentsEmpty}</p>
          ) : (
            <div className={styles.commentsList}>
              {idea.comments.map((comment) => (
                <p key={comment.id} className={styles.commentItem}>
                  {comment.text}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={() => setSheetOpen(true)}>
            {copy.commentOpenLabel}
          </button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete}>
            {copy.deleteHint}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div className={styles.sheetBackdrop} onClick={() => setSheetOpen(false)}>
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={copy.commentSheetTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.sheetTitle}>{copy.commentSheetTitle}</p>
            <textarea
              className={styles.commentArea}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              aria-label={copy.commentInputAriaLabel}
              placeholder={copy.commentInputPlaceholder}
              autoFocus
            />
            <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleAddComment}>
              {copy.commentAddLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
