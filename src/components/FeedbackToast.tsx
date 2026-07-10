import { useEffect, useState } from 'react';

import styles from './FeedbackToast.module.css';
import { copy } from '@/content/copy';

interface FeedbackToastProps {
  trigger: number;
}

export function FeedbackToast({ trigger }: FeedbackToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.toast} ${visible ? styles.visible : ''}`}
    >
      {copy.submitSuccess}
    </div>
  );
}
