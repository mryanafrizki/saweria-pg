import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { LoginLayout } from '../../views/layout';

const login = new Hono<{ Bindings: Env }>();

login.get('/login', (c) => {
  const error = c.req.query('error');

  return c.html(
    <LoginLayout title="Login">
      <div class="w-full max-w-sm">
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div class="text-center mb-6">
            <h1 class="text-xl font-bold text-gray-900">Saweria PG</h1>
            <p class="text-sm text-gray-500 mt-1">Admin Panel</p>
          </div>

          {error && (
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              Invalid password
            </div>
          )}

          <form method="post" action="/panel/login" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
              <input
                type="password"
                name="password"
                required
                autofocus
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              class="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </LoginLayout>,
  );
});

login.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const password = body['password'] as string;

  if (password === c.env.ADMIN_API_KEY) {
    setCookie(c, 'admin_session', c.env.ADMIN_API_KEY, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return c.redirect('/panel');
  }

  return c.redirect('/panel/login?error=1');
});

login.get('/logout', (c) => {
  setCookie(c, 'admin_session', '', { path: '/', maxAge: 0 });
  return c.redirect('/panel/login');
});

export default login;
