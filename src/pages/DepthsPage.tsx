import { useEffect, useState } from 'react';



import styles from './DepthsPage.module.css';

import { BreathingLines } from '@/components/BreathingLines';
import { GlowCanvas } from '@/components/GlowCanvas';

import { IdeaDetailCard } from '@/components/IdeaDetailCard';

import { FeedbackToast } from '@/components/FeedbackToast';

import { useIdeasStore } from '@/store/useIdeasStore';

import { copy } from '@/content/copy';

import type { Idea } from '@/data/types';



interface DepthsPageProps {

  newIdeaId?: string | null;

  submitTrigger?: number;

}



export function DepthsPage({ newIdeaId = null, submitTrigger = 0 }: DepthsPageProps) {

  const { ideas, clusters, markIdeaRead, addComment, removeIdea } = useIdeasStore();

  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const [activeNewIdeaId, setActiveNewIdeaId] = useState<string | null>(null);



  useEffect(() => {

    if (!newIdeaId) return;

    setActiveNewIdeaId(newIdeaId);

  }, [newIdeaId]);



  const handleSelectIdea = async (idea: Idea) => {

    if (idea.isUnread) {

      await markIdeaRead(idea.id);

      const refreshed = useIdeasStore.getState().ideas.find((item) => item.id === idea.id);

      setSelectedIdea(refreshed ?? { ...idea, isUnread: false });

      return;

    }

    setSelectedIdea(idea);

  };



  const handleClose = () => setSelectedIdea(null);



  const handleAddComment = async (id: string, text: string) => {

    await addComment(id, text);

    const refreshed = useIdeasStore.getState().ideas.find((idea) => idea.id === id) ?? null;

    setSelectedIdea(refreshed);

  };



  const handleDelete = async (id: string) => {

    setSelectedIdea(null);

    await removeIdea(id);

  };



  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.animArea}>
        <BreathingLines />
      </div>
      <div className={styles.content}>
        {ideas.length === 0 ? (
          <p className={styles.empty}>{copy.emptyDepths}</p>
        ) : (
          <GlowCanvas
            ideas={ideas}
            clusters={clusters}
            onSelectIdea={handleSelectIdea}
            newIdeaId={activeNewIdeaId}
          />
        )}
      </div>
      <FeedbackToast trigger={submitTrigger} />

      {selectedIdea && (
        <IdeaDetailCard
          idea={selectedIdea}
          onClose={handleClose}
          onAddComment={handleAddComment}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

