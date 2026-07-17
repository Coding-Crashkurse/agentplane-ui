import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { FullPageMessage } from '../components/FullPage';
import { useIsAdmin } from './roles';

/**
 * Gates admin-only routes. Non-admins get a clean not-authorized state rather
 * than the page. This is convenience: the admin APIs (Keycloak, registry)
 * enforce authorization server-side regardless of what the UI renders (SPEC §11).
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <FullPageMessage
        tone="error"
        title="Not authorized"
        detail="This area is for platform administrators only."
        action={<Button onClick={() => navigate('/')}>Back to launchpad</Button>}
      />
    );
  }
  return children;
}
