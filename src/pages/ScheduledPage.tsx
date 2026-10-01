import { CalendarClock } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function ScheduledPage() {
  return (
    <>
      <PageHeader
        title="Scheduled"
        description="Manage future campaigns before their scheduled send time."
      />
      <EmptyState
        icon={CalendarClock}
        title="Nothing scheduled"
        description="Future campaigns will appear here with options to edit, reschedule, or cancel."
      />
    </>
  );
}
