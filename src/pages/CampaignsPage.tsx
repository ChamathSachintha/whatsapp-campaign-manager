import { Megaphone } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function CampaignsPage() {
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="View drafts, active campaigns, paused campaigns, and results."
      />
      <EmptyState
        icon={Megaphone}
        title="No campaigns yet"
        description="Your created campaigns will appear here with live progress and status."
      />
    </>
  );
}
