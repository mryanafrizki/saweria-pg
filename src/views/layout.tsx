import type { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
  title: string;
  activePage?: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, activePage, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Saweria PG</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { font-family: 'Inter', system-ui, sans-serif; }
          .fade-in { animation: fadeIn 0.2s ease-in; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <div class="flex min-h-screen">
          <Sidebar activePage={activePage} />
          <main class="flex-1 p-6 lg:p-8 fade-in">
            <div class="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
};

const Sidebar: FC<{ activePage?: string }> = ({ activePage }) => {
  const links = [
    { href: '/panel', label: 'Dashboard', icon: '📊' },
    { href: '/panel/merchants', label: 'Merchants', icon: '🏪' },
    { href: '/panel/transactions', label: 'Transactions', icon: '💳' },
    { href: '/panel/webhooks', label: 'Webhook Logs', icon: '🔔' },
    { href: '/panel/proxies', label: 'Proxies', icon: '🌐' },
    { href: '/panel/test-payment', label: 'Test Payment', icon: '🧪' },
  ];

  return (
    <aside class="w-64 bg-white border-r border-gray-200 hidden lg:block">
      <div class="p-6 border-b border-gray-200">
        <h1 class="text-lg font-bold text-gray-900">Saweria PG</h1>
        <p class="text-xs text-gray-500 mt-1">Admin Panel</p>
      </div>
      <nav class="p-4 space-y-1">
        {links.map((link) => {
          const isActive = activePage === link.href;
          return (
            <a
              href={link.href}
              class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </a>
          );
        })}
      </nav>
      <div class="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <a href="/panel/logout" class="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
          <span>🚪</span> Logout
        </a>
      </div>
    </aside>
  );
};

export const LoginLayout: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} — Saweria PG</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
};
