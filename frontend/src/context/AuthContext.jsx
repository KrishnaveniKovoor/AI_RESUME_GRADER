import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('resume_grader_token'));

  useEffect(() => {
    const storedUser = localStorage.getItem('resume_grader_user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
  }, [token]);

  const login = ({ user, token }) => {
    localStorage.setItem('resume_grader_user', JSON.stringify(user));
    localStorage.setItem('resume_grader_token', token);
    setUser(user);
    setToken(token);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('resume_grader_user');
    localStorage.removeItem('resume_grader_token');
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
