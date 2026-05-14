import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { Api } from './api-response';

/**
 * Checks if the current request is authenticated.
 * Returns the session if authenticated, otherwise returns a 401 response.
 */
export async function ensureAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { authenticated: false, response: Api.unauthorized() };
  }
  
  return { authenticated: true, session };
}

/**
 * Checks if the user has a specific role.
 * (Future-proofing for RBAC)
 */
export async function ensureRole(role: string) {
  const { authenticated, session, response } = await ensureAuth();
  
  if (!authenticated) {
    return { authorized: false, response };
  }
  
  // This assumes session.user has a role property, which we should add to authOptions
  const userRole = (session?.user as any)?.role;
  
  if (userRole !== role && userRole !== 'admin') {
    return { authorized: false, response: Api.forbidden(`Requires ${role} role`) };
  }
  
  return { authorized: true, session };
}
