import { History } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Review completed, partial, failed, and cancelled campaigns."
      />
      <EmptyState
        icon={History}
        title="No history yet"
        description="Completed campaign records and recipient-level results will appear here."
      />
    </>
  );
}
