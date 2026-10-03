import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
  type TableHTMLAttributes,
} from 'react';
import { Search, X } from 'lucide-react';

function rowText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (isValidElement<{ children?: ReactNode }>(node))
    return rowText(node.props.children);
  return Children.toArray(node).map(rowText).join(' ');
}

export function PaginatedTable({
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  const sections = Children.toArray(children);
  const body = sections.find(
    (section) => isValidElement(section) && section.type === 'tbody',
  ) as ReactElement<{ children: ReactNode; className?: string }> | undefined;
  const [query, setQuery] = useState('');
  const allRows = Children.toArray(body?.props.children);
  const rows = allRows.filter((row) =>
    rowText(row).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const signature = rows
    .map((row) => (isValidElement(row) ? row.key : ''))
    .join('|');
  const [position, setPosition] = useState({ signature, page: 1 });
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const page =
    position.signature === signature ? Math.min(position.page, pages) : 1;
  const start = (page - 1) * 10;
  return (
    <>
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Search this table</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this list…"
          />
          {query && (
            <button
              type="button"
              className="button button-icon button-quiet"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
              <span className="action-label">Close</span>
            </button>
          )}
        </label>
        <span className="list-count" aria-live="polite">
          {rows.length} {rows.length === 1 ? 'record' : 'records'}
          {query && ` matching “${query}”`}
        </span>
      </div>
      <table {...props}>
        {sections.map((section) =>
          section === body ? (
            <tbody key="body" className={body.props.className}>
              {rows.length ? (
                rows.slice(start, start + 10)
              ) : (
                <tr>
                  <td colSpan={20} className="p-8 text-center text-slate-500">
                    {query
                      ? 'No matches. Try a different search or clear the search.'
                      : 'No records to display.'}
                  </td>
                </tr>
              )}
            </tbody>
          ) : (
            section
          ),
        )}
      </table>
      <nav
        aria-label="Table pagination"
        className="flex items-center justify-between gap-4 border-t p-4 text-sm text-slate-600"
      >
        <span>
          {rows.length
            ? `${start + 1}–${Math.min(start + 10, rows.length)} of ${rows.length}`
            : 'No records'}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPosition({ signature, page: page - 1 })}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page === pages}
            onClick={() => setPosition({ signature, page: page + 1 })}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </nav>
    </>
  );
}
