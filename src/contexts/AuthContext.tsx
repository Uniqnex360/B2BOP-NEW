import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase, UserProfile } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setupPassword: (
    token: string,
    password: string,
  ) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthProvider] Initializing auth state...");

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AuthProvider] Error fetching initial session:", error);
      }
      console.log(
        "[AuthProvider] Initial session fetch result:",
        session ? `User ID: ${session.user.id}` : "No session",
      );

      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        console.log("[AuthProvider] No active user, setting loading to false.");
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        `[AuthProvider] Auth state changed: EVENT="${event}"`,
        session ? `User ID: ${session.user.id}` : "No session",
      );

      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          console.log(
            "[AuthProvider] Auth state changed to signed out/null. Clearing profile.",
          );
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      console.log("[AuthProvider] Cleaning up auth listener subscription.");
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    console.log(
      `[AuthProvider] Attempting to load profile for userId: "${userId}"`,
    );
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "[AuthProvider] Supabase DB error loading profile:",
          error,
        );
        throw error;
      }

      console.log("[AuthProvider] Profile successfully loaded:", data);
      setProfile(data);
    } catch (error) {
      console.error(
        "[AuthProvider] Catch block hit while loading profile:",
        error,
      );
    } finally {
      console.log(
        "[AuthProvider] Finished loadProfile execution. Setting loading to false.",
      );
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log(`[AuthProvider] Attempting signIn for email: "${email}"`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AuthProvider] signIn error:", error.message);
        return { error };
      }

      console.log("[AuthProvider] signIn successful:", data.user?.id);
      return { error: null };
    } catch (error) {
      console.error("[AuthProvider] Unexpected error in signIn:", error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    console.log("[AuthProvider] Attempting signOut...");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthProvider] Error during signOut:", error);
      } else {
        console.log("[AuthProvider] signOut successful.");
      }
    } catch (error) {
      console.error("[AuthProvider] Unexpected error during signOut:", error);
    } finally {
      setProfile(null);
    }
  };

  const setupPassword = async (token: string, password: string) => {
    console.log("[AuthProvider] Attempting setupPassword (updateUser)...");
    try {
      // Note: "token" parameter is currently unused in your logic below.
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("[AuthProvider] setupPassword error:", error.message);
        return { error };
      }

      console.log(
        "[AuthProvider] setupPassword successful for user:",
        data.user?.id,
      );
      return { error: null };
    } catch (error) {
      console.error("[AuthProvider] Unexpected error in setupPassword:", error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signOut, setupPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error("[useAuth] Context accessed outside of AuthProvider!");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
