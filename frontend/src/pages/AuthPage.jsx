import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useChat } from '../context/ChatContext';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, MessageSquare } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, setUser, apiUrl } = useChat();
  const navigate = useNavigate();

  // If user is already logged in, redirect to chat dashboard
  useEffect(() => {
    if (user) {
      navigate('/chats');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || (!isLogin && !username)) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email, password } 
        : { username, email, password };

      const { data } = await axios.post(`${apiUrl}${endpoint}`, payload);
      
      // Save user details & token to local storage
      localStorage.setItem('userInfo', JSON.stringify(data));
      
      // Update context state
      setUser(data);
      
      // Redirect to chats page
      navigate('/chats');
    } catch (err) {
      setError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${apiUrl}/auth/google`, {
        credential: credentialResponse.credential,
      });

      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      navigate('/chats');
    } catch (err) {
      setError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Google Sign-In failed. Make sure your server has the correct Client ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Try again.');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      {/* Background glowing circles */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'rgba(99, 102, 241, 0.15)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        top: '20%',
        left: '25%',
        zIndex: -1,
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'rgba(236, 72, 153, 0.12)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        bottom: '20%',
        right: '25%',
        zIndex: -1,
      }}></div>

      {/* Main glass card container */}
      <div className="glass" style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '24px',
        padding: '40px',
        animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Brand Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            background: 'var(--accent-gradient)',
            borderRadius: '16px',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}>
            <MessageSquare size={28} color="white" />
          </div>
          <h1 className="heading-font" style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(to right, #ffffff, #9ca3af)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            OrbitChat
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginTop: '6px',
          }}>
            {isLogin ? 'Sign in to access your chats' : 'Create an account to start chatting'}
          </p>
        </div>

        {/* Error message alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <UserIcon style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }} size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required={!isLogin}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} size={18} />
            <input
              type="email"
              className="input-field"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '44px' }}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} size={18} />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '44px' }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '10px',
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? 'none' : 'auto',
            }}
          >
            {loading ? (
              <span>Processing...</span>
            ) : isLogin ? (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 10px', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {/* Google Login Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="dark"
            shape="pill"
            width="360"
          />
        </div>

        {/* Toggle between Register/Login */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.9rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 2px',
            }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

