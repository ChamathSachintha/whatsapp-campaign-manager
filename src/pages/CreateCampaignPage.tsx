import { GripVertical, Image, FileText, Type } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

const mockItems = [
  { label: 'Text message', icon: Type },
  { label: 'Image + caption', icon: Image },
  { label: 'Document', icon: FileText },
];

export function CreateCampaignPage() {
  return (
    <>
      <PageHeader
        title="Create Campaign"
        description="Build an ordered sequence of messages for imported recipients."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Message sequence</h3>
              <p className="mt-1 text-sm text-slate-500">
                Drag-and-drop editing will be enabled in the composer phase.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
            >
              + Add Message
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {mockItems.map(({ label, icon: Icon }, index) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
              >
                <GripVertical className="text-slate-300" size={20} />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {index + 1}. {label}
                  </p>
                  <p className="text-xs text-slate-400">Placeholder item</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Campaign summary</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Recipients</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Messages</dt>
              <dd className="font-semibold">0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Mode</dt>
              <dd className="font-semibold">Draft</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
