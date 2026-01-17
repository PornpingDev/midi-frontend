import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/auth/login', {
        email: email.toLowerCase(),
        password
      });

      const { email: userEmail, role, name } = response.data;

      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', name);

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '100px auto' }}>
      <h2 className="text-center mb-4">เข้าสู่ระบบ MIDI</h2>
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button type="submit" className="btn btn-primary w-100">เข้าสู่ระบบ</button>
      </form>
    </div>
  );
};

export default Login;
