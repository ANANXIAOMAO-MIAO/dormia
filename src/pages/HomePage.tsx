import styles from './HomePage.module.css';
import { BreathingLines } from '@/components/BreathingLines';
import { copy } from '@/content/copy';

interface HomePageProps {
  onStartCompose: () => void;
}

export function HomePage({ onStartCompose }: HomePageProps) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        <img
          src="/dormia-title.png"
          alt={copy.homeTitle}
          className={styles.titleImage}
          draggable={false}
        />
      </h1>
      <div className={styles.animArea}>
        <BreathingLines />
      </div>
      <div className={styles.inputArea}>
        <p className={styles.intro}>{copy.homeIntro}</p>
        <button className={styles.ctaBtn} onClick={onStartCompose}>
          {copy.homeCtaLabel}
        </button>
      </div>
    </div>
  );
}
