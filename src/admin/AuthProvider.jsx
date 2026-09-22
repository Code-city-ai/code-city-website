import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { workspaceRequest } from '@/admin/projects/client';

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

    const loadProfile = async (currentSession) => {
      if (!active) return;
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

      if (!active) return;
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
      setLoading(true);
      loadProfile(nextSession);
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
      // Best-effort revoke the project grant before invalidating the Auth session.
      // The one-hour grant is bound to this session, never to a later login.
      await workspaceRequest('lock').catch(() => undefined);
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
