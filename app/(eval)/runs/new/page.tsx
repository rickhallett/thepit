// Run creation page (M3.3). Server component that renders RunForm.

import { RunForm } from '@/components/eval/RunForm';

export const metadata = {
  title: 'New Run - The Pit',
};

export default function NewRunPage() {
  return (
    <div>
      <h1 className="mb-6 text-lg uppercase tracking-[0.3em] text-foreground">
        Create Run
      </h1>
      <RunForm />
    </div>
  );
}
