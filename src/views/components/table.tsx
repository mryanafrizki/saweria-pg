import type { FC } from 'hono/jsx';

interface Column {
  key: string;
  label: string;
  class?: string;
}

interface TableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

export const Table: FC<TableProps> = ({ columns, rows, emptyMessage }) => {
  return (
    <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th class={`px-4 py-3 text-left font-medium text-gray-500 ${col.class ?? ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colspan={columns.length} class="px-4 py-8 text-center text-gray-400">
                {emptyMessage ?? 'No data'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr class="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td class={`px-4 py-3 text-gray-700 ${col.class ?? ''}`}>
                    {String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-700',
  };

  const colorClass = colors[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';

  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

interface PaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
}

export const Pagination: FC<PaginationProps> = ({ page, totalPages, baseUrl }) => {
  if (totalPages <= 1) return null;

  const separator = baseUrl.includes('?') ? '&' : '?';

  return (
    <div class="flex items-center justify-between mt-4">
      <p class="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div class="flex gap-2">
        {page > 1 && (
          <a
            href={`${baseUrl}${separator}page=${page - 1}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Previous
          </a>
        )}
        {page < totalPages && (
          <a
            href={`${baseUrl}${separator}page=${page + 1}`}
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
};
