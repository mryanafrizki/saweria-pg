import type { FC } from 'hono/jsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  subtext?: string;
}

export const StatCard: FC<StatCardProps> = ({ label, value, icon, subtext }) => {
  return (
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">{label}</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && <p class="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div class="text-3xl">{icon}</div>
      </div>
    </div>
  );
};
