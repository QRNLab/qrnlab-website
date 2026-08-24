import { useNavigate } from '@solidjs/router';
import { BlogEditor } from '../../components/blog/BlogEditor';
import { RequireAuth } from '../guard';

export default function NewPost() {
  const navigate = useNavigate();
  return (
    <RequireAuth>
      <BlogEditor initial={null} onSaved={() => navigate('/blog')} />
    </RequireAuth>
  );
}
