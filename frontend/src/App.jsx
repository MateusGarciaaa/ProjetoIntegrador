import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { ToastProvider } from './contexts/ToastProvider';
import { AppRoutes } from './routes/AppRoutes';

const FLAGS_ROUTER = { v7_startTransition: true, v7_relativeSplatPath: true };

export function App() {
  return (
    <BrowserRouter future={FLAGS_ROUTER}>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
