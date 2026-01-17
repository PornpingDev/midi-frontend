import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

type Role = 'admin' | 'stock' | 'sales' | 'report';

export const useUserRole = () => {
  const [email, setEmail] = useState<string>('Unknown');
  const [role, setRole] = useState<Role | 'Unknown'>('Unknown');
  const [loading, setLoading] = useState(true);

  const hydrateFromLS = () => {
    const e = localStorage.getItem('userEmail');
    const r = localStorage.getItem('userRole') as Role | null;
    if (e) setEmail(e);
    if (r) setRole(r);
  };

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/auth/me'); // ใช้คุกกี้ sid อัตโนมัติ
      if (data?.user) {
        setEmail(data.user.email);
        setRole(data.user.role);
        // sync ไว้ชั่วคราวเพื่อความเข้ากันได้กับโค้ดเดิม
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userRole', data.user.role);
      } else {
        hydrateFromLS();
      }
    } catch {
      hydrateFromLS();
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await axios.post('/auth/logout'); } catch {}
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    setEmail('Unknown');
    setRole('Unknown');
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return { email, role, loading, refresh: fetchMe, logout };
};
