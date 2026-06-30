import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ChatProvider } from './context/ChatContext';
import './index.css';
import App from './App.jsx';

// Fetch Google Client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ChatProvider>
        <App />
      </ChatProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

