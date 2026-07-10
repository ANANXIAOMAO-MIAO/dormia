import styles from './ViewSwitcher.module.css';

import { copy } from '@/content/copy';



type View = 'home' | 'depths';



interface ViewSwitcherProps {

  view: View;

  onSwitch: (v: View) => void;

}



export function ViewSwitcher({ view, onSwitch }: ViewSwitcherProps) {

  return (

    <nav className={styles.switcher} aria-label={copy.navAriaLabel}>

      <button

        className={`${styles.btn} ${view === 'home' ? styles.active : ''}`}

        onClick={() => onSwitch('home')}

      >

        {copy.navHome}

      </button>

      <button

        className={`${styles.btn} ${view === 'depths' ? styles.active : ''}`}

        onClick={() => onSwitch('depths')}

      >

        {copy.navDepths}

      </button>

    </nav>

  );

}

