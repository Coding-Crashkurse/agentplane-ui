import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { FullPageMessage, FullPageSpinner } from '../../components/FullPage';

/** OIDC redirect target: react-oidc-context processes the code automatically. */
export function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      const target = typeof auth.user?.state === 'string' ? auth.user.state : '/';
      navigate(target, { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  if (auth.error) {
    return (
      <FullPageMessage
        tone="error"
        title="Sign-in failed"
        detail={auth.error.message}
        action={<Button onClick={() => void auth.signinRedirect()}>Try again</Button>}
      />
    );
  }
  return <FullPageSpinner label="Signing you in…" />;
}
