import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useChat } from './context/ChatContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

function App() {
  const { user } = useChat();

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Protected Chat Route */}
        <Route 
          path="/chats" 
          element={user ? <ChatPage /> : <Navigate to="/auth" replace />} 
        />
        
        {/* Fallback routing */}
        <Route 
          path="*" 
          element={<Navigate to={user ? "/chats" : "/auth"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
