import { Title } from '@solidjs/meta';
import { Loading, type ParentProps } from 'solid-js';
import { AppShell } from './components/layout/AppShell';
import { Skeleton } from './components/ui';
import { Toaster } from './components/ui/Toaster';
import { Router } from './router';
import { SessionProvider, logoutAction } from './lib/session';
import './styles.css';

function ShellLoader(props: ParentProps) {
  return (
    <AppShell onLogout={logoutAction}>
      <Loading
        fallback={
          <main class="mx-auto max-w-4xl space-y-4 p-6">
            <Skeleton class="h-8 w-64" />
            <Skeleton class="h-4 w-96" />
            <Skeleton class="h-32 w-full" />
            <Skeleton class="h-32 w-full" />
          </main>
        }
      >
        {props.children}
      </Loading>
    </AppShell>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Router>
        {(props) => (
          <>
            <Title>QRNLab — Dashboard</Title>
            <ShellLoader>{props.children}</ShellLoader>
            <Toaster position="bottom-right" richColors closeButton />
          </>
        )}
      </Router>
    </SessionProvider>
  );
}
