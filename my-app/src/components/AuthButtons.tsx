// src/components/AuthButtons.tsx
import { loginWithGoogle, logout } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";

export default function AuthButtons() {
  const { user, loading } = useAuth();

  if (loading) return <p>로딩중...</p>;

  if (!user) {
    return (
      <button
        onClick={() => loginWithGoogle().catch((e) => alert(e.message))}
        style={{ padding: "8px 12px", borderRadius: 8 }}
      >
        Google로 로그인
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <img
        src={user.photoURL ?? ""}
        alt="avatar"
        style={{ width: 32, height: 32, borderRadius: "50%" }}
      />
      <span>{user.displayName ?? user.email}</span>
      <button
        onClick={() => logout().catch((e) => alert(e.message))}
        style={{ padding: "6px 10px", borderRadius: 8 }}
      >
        로그아웃
      </button>
    </div>
  );
}
