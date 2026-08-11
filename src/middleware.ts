import { defineMiddleware } from 'astro:middleware';
import { getAuth } from './lib/server/auth';

async function getSessionSafe(context: any): Promise<any> {
  try {
    const auth = await getAuth();
    return await auth.api.getSession({ headers: context.request.headers });
  } catch (err) {
    console.error('[middleware] session check failed:', err);
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const isAccount = path === '/account' || path.startsWith('/account/');
  if (isAccount) {
    const session = await getSessionSafe(context);
    if (!session) {
      return context.redirect(`/login?redirect=${encodeURIComponent(path)}`);
    }
    context.locals.session = session;
    return next();
  }

  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  if (isAdmin) {
    const session = await getSessionSafe(context);
    if (!session) {
      return context.redirect(`/login?redirect=${encodeURIComponent(path)}`);
    }
    const role = session.user.role;
    const isEditorPage =
      path === '/admin/blog' || path.startsWith('/admin/blog/') ||
      path === '/admin/publications' || path.startsWith('/admin/publications/');
    const allowed = role === 'admin' || (role === 'editor' && isEditorPage);
    if (!allowed) {
      return context.redirect('/account');
    }
    context.locals.session = session;
    return next();
  }

  return next();
});
