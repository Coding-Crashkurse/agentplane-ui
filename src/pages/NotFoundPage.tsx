import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { FullPageMessage } from '../components/FullPage';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <FullPageMessage
      title="Page not found"
      detail="The page you are looking for does not exist."
      action={<Button onClick={() => navigate('/')}>Back to launchpad</Button>}
    />
  );
}
