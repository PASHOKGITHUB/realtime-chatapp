import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useChat } from '../context/ChatContext';
import { 
  Search, LogOut, MessageSquare, Send, Users, 
  X, Check, AlertCircle, Plus, Smile, Shield,
  ArrowLeft, Trash2
} from 'lucide-react';

const ChatPage = () => {
  const navigate = useNavigate();
  const { 
    user, setUser, logout, chats, setChats, selectedChat, setSelectedChat, 
    socket, onlineUsers, apiUrl 
  } = useChat();

  // Search & Navigation States
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Message States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Typing States
  const [isTyping, setIsTyping] = useState(false);
  const [typingChatId, setTypingChatId] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Group Modal States
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  // Auto-scroll ref
  const messagesEndRef = useRef(null);

  // Profile Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const openProfileModal = () => {
    setEditUsername(user?.username || '');
    setEditAvatar(user?.avatar || '');
    setProfileError('');
    setProfileSuccess('');
    setProfileModalOpen(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        }
      };
      const { data } = await axios.post(`${apiUrl}/upload`, formData, config);
      setEditAvatar(data.filePath);
      setProfileSuccess('Image uploaded successfully! Remember to Save Changes.');
    } catch (err) {
      setProfileError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Image upload failed. Max size 2MB.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      setProfileError('Username cannot be empty');
      return;
    }

    setProfileError('');
    setProfileSuccess('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      };
      const { data } = await axios.put(`${apiUrl}/auth/profile`, {
        username: editUsername,
        avatar: editAvatar
      }, config);

      // Update local storage and context state
      const updatedUser = { ...user, username: data.username, avatar: data.avatar, token: data.token };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setProfileModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error('Profile save error detail:', err);
      setProfileError(
        err.response && err.response.data.message
          ? err.response.data.message
          : `${err.message || 'Profile update failed'}`
      );
    }
  };

  // 1. Authentication Check
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      fetchUserChats();
    }
  }, [user, navigate]);

  // 2. Scroll to Bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 3. Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Join room when active chat changes
    if (selectedChat) {
      socket.emit('join chat', selectedChat._id);
      fetchChatMessages();
    }

    // Listen for incoming messages
    const handleMessageReceived = (message) => {
      // If message is in the currently selected chat, display it
      if (selectedChat && selectedChat._id === message.chat._id) {
        setMessages((prev) => [...prev, message]);
      } else {
        // Otherwise, update the latestMessage preview for the sidebar
        updateChatsListPreview(message);
      }
    };

    const handleTyping = (room) => {
      if (selectedChat && selectedChat._id === room) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (room) => {
      if (selectedChat && selectedChat._id === room) {
        setIsTyping(false);
      }
    };

    socket.on('message received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    return () => {
      socket.off('message received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket, selectedChat]);

  // Helper to update sidebar when a message comes in for another room
  const updateChatsListPreview = (message) => {
    setChats((prevChats) => {
      const updated = prevChats.map((c) => {
        if (c._id === message.chat._id) {
          return { ...c, latestMessage: message };
        }
        return c;
      });
      // Sort so recently active chats go to the top
      return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });
  };

  // 4. API Requests
  const fetchUserChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${apiUrl}/chats`, config);
      setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err.message);
    }
  };

  const fetchChatMessages = async () => {
    if (!selectedChat) return;
    setLoadingMessages(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${apiUrl}/messages/${selectedChat._id}`, config);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Search users to start a chat
  const handleSearch = async (query) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${apiUrl}/auth?search=${query}`, config);
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Start 1-on-1 chat
  const handleAccessChat = async (targetUserId) => {
    if (loadingChat) return;

    // Check if we already have a 1-on-1 chat with this user in our state
    const existingChat = chats.find((c) => 
      !c.isGroupChat && c.users.some((u) => u._id === targetUserId)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      setSearch('');
      setSearchResults([]);
      return;
    }

    setLoadingChat(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${apiUrl}/chats`, { userId: targetUserId }, config);
      
      // If chat is not in the list, add it
      if (!chats.find((c) => c._id === data._id)) {
        setChats((prev) => [data, ...prev]);
      }
      setSelectedChat(data);
      setSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error opening chat:', err.message);
    } finally {
      setLoadingChat(false);
    }
  };

  // Delete Chat
  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation(); // Prevent opening the chat when clicking delete
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`${apiUrl}/chats/${chatId}`, config);
      
      // Update local chats list
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      
      // Clear selection if deleted chat was active
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error('Error deleting chat:', err.message);
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    // Trigger stop typing immediately on send
    if (socket) {
      socket.emit('stop typing', selectedChat._id);
    }

    const messageText = newMessage;
    setNewMessage('');

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`${apiUrl}/messages`, {
        content: messageText,
        chatId: selectedChat._id,
      }, config);

      // Broadcast to other participants via Socket
      if (socket) {
        socket.emit('new message', data);
      }

      setMessages((prev) => [...prev, data]);
      
      // Update latest message preview in sidebar
      updateChatsListPreview(data);
    } catch (err) {
      console.error('Failed to send message:', err.message);
    }
  };

  // Typing action with debounce
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedChat) return;

    socket.emit('typing', selectedChat._id);

    // Debounce to stop typing indicator after 2s of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop typing', selectedChat._id);
    }, 2000);
  };

  // Search users for creating group chat
  const handleGroupSearch = async (query) => {
    setGroupSearch(query);
    if (!query.trim()) {
      setGroupSearchResults([]);
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${apiUrl}/auth?search=${query}`, config);
      setGroupSearchResults(data);
    } catch (err) {
      console.error('Group search error:', err.message);
    }
  };

  const handleSelectGroupUser = (userToAdd) => {
    if (selectedGroupUsers.find((u) => u._id === userToAdd._id)) return;
    setSelectedGroupUsers((prev) => [...prev, userToAdd]);
  };

  const handleRemoveGroupUser = (userId) => {
    setSelectedGroupUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedGroupUsers.length < 2) {
      alert('Please fill in group name and select at least 2 users');
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        name: groupName,
        users: JSON.stringify(selectedGroupUsers.map((u) => u._id)),
      };
      const { data } = await axios.post(`${apiUrl}/chats/group`, payload, config);
      setChats((prev) => [data, ...prev]);
      setSelectedChat(data);
      
      // Reset group modal
      setGroupName('');
      setSelectedGroupUsers([]);
      setGroupModalOpen(false);
    } catch (err) {
      console.error('Failed to create group:', err.message);
    }
  };

  // Helper: Get Chat Name (excluding current user name for 1-to-1)
  const getChatName = (chat) => {
    if (!chat) return '';
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser ? otherUser.username : 'Unknown User';
  };

  // Helper: Get Chat Avatar
  const getChatAvatar = (chat) => {
    if (!chat) return '';
    if (chat.isGroupChat) return `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.chatName}`;
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser ? otherUser.avatar : 'https://api.dicebear.com/7.x/adventurer/svg?seed=placeholder';
  };

  // Helper: Check if 1-to-1 Chat recipient is online
  const isChatOnline = (chat) => {
    if (!chat || chat.isGroupChat) return false;
    const otherUser = chat.users.find((u) => u._id !== user?._id);
    return otherUser ? onlineUsers.includes(otherUser._id) || otherUser.isOnline : false;
  };

  return (
    <div className="chat-page">
      {/* SIDEBAR */}
      <div className={`glass sidebar ${selectedChat ? 'mobile-hidden' : 'mobile-full-width'}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div 
            onClick={openProfileModal}
            className="sidebar-profile"
            title="Edit Profile"
          >
            <div className="avatar-container">
              <img 
                className="avatar-img" 
                src={user?.avatar} 
                alt="Profile" 
                style={{ width: '40px', height: '40px' }} 
              />
              <span className="status-badge online"></span>
            </div>
            <div>
              <h3 className="heading-font" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {user?.username}
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to edit</span>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="btn btn-secondary sidebar-logout-btn" 
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Sidebar Search Bar */}
        <div className="search-wrapper">
          <div className="search-input-container">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="input-field search-input"
              placeholder="Search users to start chat..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Search Result Overlay */}
          {search && (
            <div className="glass search-results-overlay">
              {loadingSearch ? (
                <div style={{ padding: '15px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '15px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No users found
                </div>
              ) : (
                searchResults.map((searchUser) => (
                  <div
                    key={searchUser._id}
                    onClick={() => handleAccessChat(searchUser._id)}
                    className="search-result-item"
                  >
                    <img 
                      src={searchUser.avatar} 
                      alt="" 
                      className="search-result-avatar"
                    />
                    <div className="search-result-username">{searchUser.username}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Create Group Chat Button */}
        <div className="group-btn-wrapper">
          <button 
            className="btn btn-secondary group-btn" 
            onClick={() => setGroupModalOpen(true)}
          >
            <Plus size={14} />
            <span>New Group Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="conversations-container">
          {chats.length === 0 ? (
            <div className="no-conversations">
              No conversations started yet. Search for users above to begin!
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = selectedChat?._id === chat._id;
              const online = isChatOnline(chat);
              
              return (
                <div
                  key={chat._id}
                  onClick={() => setSelectedChat(chat)}
                  className={`conversation-item ${isSelected ? 'active' : ''}`}
                >
                  <div className="avatar-container">
                    <img 
                      className="avatar-img" 
                      src={getChatAvatar(chat)} 
                      alt="" 
                      style={{ width: '42px', height: '42px' }} 
                    />
                    {!chat.isGroupChat && (
                      <span className={`status-badge ${online ? 'online' : 'offline'}`}></span>
                    )}
                  </div>
                  
                  <div className="conversation-item-info">
                    <div className="conversation-item-header">
                      <div className="conversation-item-name">
                        {getChatName(chat)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {chat.latestMessage && (
                          <span className="conversation-item-time">
                            {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <button
                          className="delete-chat-btn"
                          onClick={(e) => handleDeleteChat(chat._id, e)}
                          title="Delete conversation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="conversation-item-msg">
                      {chat.latestMessage ? (
                        <>
                          <span style={{ fontWeight: 600 }}>
                            {chat.latestMessage.sender._id === user?._id ? 'You: ' : `${chat.latestMessage.sender.username}: `}
                          </span>
                          {chat.latestMessage.content}
                        </>
                      ) : (
                        <span style={{ fontStyle: 'italic' }}>New chat created</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT WINDOW */}
      {/* CHAT WINDOW */}
      <div className={`chat-window ${!selectedChat ? 'mobile-hidden' : 'mobile-full-width'}`}>
        {selectedChat ? (
          <>
            {/* Chat Window Header */}
            <div className="glass chat-header">
              <div className="chat-header-info">
                {/* Back Button for Mobile */}
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="mobile-back-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    padding: '6px',
                    marginRight: '4px',
                    display: 'none',
                  }}
                  title="Back to Chats"
                >
                  <ArrowLeft size={20} />
                </button>
                
                <div className="avatar-container">
                  <img 
                    className="avatar-img" 
                    src={getChatAvatar(selectedChat)} 
                    alt="" 
                    style={{ width: '42px', height: '42px' }} 
                  />
                  {!selectedChat.isGroupChat && (
                    <span className={`status-badge ${isChatOnline(selectedChat) ? 'online' : 'offline'}`}></span>
                  )}
                </div>
                <div>
                  <h3 className="heading-font chat-header-title">
                    {getChatName(selectedChat)}
                  </h3>
                  <span className="chat-header-status">
                    {selectedChat.isGroupChat 
                      ? `${selectedChat.users.length} members`
                      : isChatOnline(selectedChat) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="messages-list" style={{
              background: 'radial-gradient(circle at bottom left, #0f1322 0%, var(--bg-main) 70%)',
            }}>
              {loadingMessages ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}>
                  Loading conversation history...
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.sender._id === user?._id;
                  
                  return (
                    <div
                      key={msg._id}
                      className={`message-row ${isOwnMessage ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble-wrapper">
                        {/* Sender details (Only in group chat for other users) */}
                        {selectedChat.isGroupChat && !isOwnMessage && (
                          <span className="message-sender-name">
                            {msg.sender.username}
                          </span>
                        )}

                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          gap: '8px',
                          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                        }}>
                          {/* Avatar */}
                          {!isOwnMessage && (
                            <img 
                              src={msg.sender.avatar} 
                              alt="" 
                              style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                            />
                          )}

                          {/* Bubble */}
                          <div className="message-bubble">
                            {msg.content}
                          </div>
                        </div>

                        {/* Time */}
                        <span className="message-meta">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={handleSendMessage}
              className="glass chat-input-area"
            >
              <div className="chat-input-form">
                <input
                  type="text"
                  className="input-field chat-input-field"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleInputChange}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary send-btn"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Empty Chat Area Placeholder */
          <div className="welcome-screen" style={{
            background: 'radial-gradient(circle at bottom right, #111422 0%, var(--bg-main) 70%)',
          }}>
            <div className="welcome-logo-container" style={{ color: 'var(--primary)' }}>
              <MessageSquare size={48} />
            </div>
            <h2 className="heading-font welcome-title">
              Welcome to OrbitChat
            </h2>
            <p className="welcome-subtitle">
              Search for friends in the sidebar or start a new group conversation to begin messaging in real time.
            </p>
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      {groupModalOpen && (
        <div className="modal-overlay">
          <div className="glass modal-container" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Create Group Chat
              </h3>
              <button 
                onClick={() => {
                  setGroupModalOpen(false);
                  setSelectedGroupUsers([]);
                  setGroupName('');
                  setGroupSearch('');
                  setGroupSearchResults([]);
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Group Name input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Group Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Dream Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Add Users input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Add Group Members (Min 2)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Search username or email..."
                value={groupSearch}
                onChange={(e) => handleGroupSearch(e.target.value)}
              />
            </div>

            {/* Selected users chips */}
            {selectedGroupUsers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedGroupUsers.map((u) => (
                  <div
                    key={u._id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>{u.username}</span>
                    <button 
                      onClick={() => handleRemoveGroupUser(u._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Group search results */}
            {groupSearch && (
              <div style={{
                maxHeight: '130px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)',
              }}>
                {groupSearchResults.length === 0 ? (
                  <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No users found</div>
                ) : (
                  groupSearchResults.map((searchUser) => (
                    <div
                      key={searchUser._id}
                      onClick={() => handleSelectGroupUser(searchUser)}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={searchUser.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        <span>{searchUser.username}</span>
                      </div>
                      <Plus size={14} color="var(--primary)" />
                    </div>
                  ))
                )}
              </div>
            )}

            <button 
              className="btn btn-primary"
              onClick={handleCreateGroupChat}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Create Chat Group
            </button>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {profileModalOpen && (
        <div className="modal-overlay">
          <div className="glass modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Edit Profile
              </h3>
              <button 
                onClick={() => setProfileModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error & Success Messages */}
            {profileError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}>
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}>
                {profileSuccess}
              </div>
            )}

            {/* Avatar Preview and Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <img 
                src={editAvatar} 
                alt="Avatar Preview" 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
              />
              
              <label 
                className="btn btn-secondary" 
                style={{ 
                  fontSize: '0.8rem', 
                  padding: '6px 12px', 
                  cursor: 'pointer',
                  borderRadius: '8px'
                }}
              >
                <span>{uploading ? 'Uploading...' : 'Upload Avatar'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  style={{ display: 'none' }} 
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Username Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="Username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={uploading}
              style={{ width: '100%', marginTop: '10px', opacity: uploading ? 0.7 : 1 }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
