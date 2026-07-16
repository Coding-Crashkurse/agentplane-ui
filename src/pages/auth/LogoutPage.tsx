import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { FullPageMessage, FullPageSpinner } from '../../components/FullPage';

/** Initiates the OIDC end-session flow and doubles as the post-logout landing page. */
export function LogoutPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [initiated, setInitiated] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && !initiated) {
      setInitiated(true);
      void auth.signoutRedirect();
    }
  }, [auth, initiated]);

  if (auth.isLoading || auth.isAuthenticated) {
    return <FullPageSpinner label="Signing you out…" />;
  }
  return (
    <FullPageMessage
      title="You have been signed out"
      detail="Your session has ended."
      action={<Button onClick={() => navigate('/')}>Sign in again</Button>}
    />
  );
}
