import { useEffect, useState } from 'react';



import styles from './App.module.css';

import { ViewSwitcher } from '@/components/ViewSwitcher';

import { HomePage } from '@/pages/HomePage';

import { RecordPage } from '@/pages/RecordPage';

import { DepthsPage } from '@/pages/DepthsPage';

import { useIdeasStore } from '@/store/useIdeasStore';



type View = 'home' | 'record' | 'depths';



export default function App() {

  const [view, setView] = useState<View>('home');

  const [newIdeaId, setNewIdeaId] = useState<string | null>(null);

  const [submitTrigger, setSubmitTrigger] = useState(0);

  const { init, initialized } = useIdeasStore();



  useEffect(() => {

    void init();

  }, [init]);



  const handleSwitch = (next: 'home' | 'depths') => {

    setView(next);

  };



  const handleStartCompose = () => {

    setView('record');

  };



  const handleRecordBack = () => {

    setView('home');

  };



  const handleRecordSubmitSuccess = (ideaId: string) => {

    setNewIdeaId(ideaId);

    setSubmitTrigger((n) => n + 1);

    setView('depths');

  };



  if (!initialized) return null;



  return (

    <div className={styles.root}>

      {view !== 'record' ? <ViewSwitcher view={view} onSwitch={handleSwitch} /> : null}



      <div className={`${styles.page} ${view === 'home' ? styles.pageVisible : ''}`}>

        <HomePage onStartCompose={handleStartCompose} />

      </div>

      <div className={`${styles.page} ${view === 'record' ? styles.pageVisible : ''}`}>

        <RecordPage onBack={handleRecordBack} onSubmitSuccess={handleRecordSubmitSuccess} />

      </div>

      <div className={`${styles.page} ${view === 'depths' ? styles.pageVisible : ''}`}>

        <DepthsPage newIdeaId={newIdeaId} submitTrigger={submitTrigger} />

      </div>

    </div>

  );

}

