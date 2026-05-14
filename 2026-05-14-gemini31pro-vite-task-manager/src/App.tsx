import { AuthProvider, useAuth } from './AuthContext';
import { Auth } from './Auth';
import { Tasks } from './Tasks';

function AppContent() {
  const { user } = useAuth();
  
  if (!user) {
    return <Auth />;
  }
  
  return <Tasks />;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
