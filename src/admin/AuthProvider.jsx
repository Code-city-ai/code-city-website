import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthError('The secure portal is not connected to Supabase in this environment.');
      setLoading(false);
      return undefined;
    }

    let active = true;
    let profileUserId = null;
    let profileRequest = 0;

    const loadProfile = async (currentSession) => {
      if (!active) return;
      const request = ++profileRequest;
      const nextUserId = currentSession?.user?.id || null;
      if (profileUserId !== nextUserId) {
        profileUserId = nextUserId;
        setProfile(null);
        setLoading(Boolean(nextUserId));
      }
      setSession(currentSession);
      if (!currentSession?.user) {
        setProfile(null);
        setAuthError('');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .select('user_id, full_name, role, is_active, last_seen_at')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (!active || request !== profileRequest) return;
      if (error || !data?.is_active) {
        setProfile(null);
        setAuthError('This account is authenticated but is not authorized for the Code City portal.');
      } else {
        setProfile(data);
        setAuthError('');
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase emits SIGNED_IN again on tab focus. Preserve the selected project
      // while refreshing the same identity, and query outside the Auth callback lock.
      queueMicrotask(() => loadProfile(nextSession));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    profile,
    loading,
    authError,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) return { error: new Error('Supabase is not configured.') };
      return supabase.auth.signInWithPassword({ email, password });
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return { error: new Error('Supabase is not configured.') };
      return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/set-password`,
      });
    },
    updatePassword: async (password) => {
      if (!supabase) return { error: new Error('Supabase is not configured.') };
      return supabase.auth.updateUser({ password });
    },
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      window.location.assign('/sign-in');
    },
  }), [authError, loading, profile, session]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider.');
  return context;
};
