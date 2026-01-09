const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Auth types and functions
export type AuthResponse = {
  token: string;
  user_id: string;
  username: string;
};

export async function register(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Profile types and functions
export type UserProfile = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type UserSession = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_active: string;
  is_current: boolean;
};

function getAuthUserHeaders(): HeadersInit {
  const stored = localStorage.getItem("auth_user");
  if (!stored) throw new Error("Not authenticated");
  const { token } = JSON.parse(stored);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/auth/profile`, {
    headers: getAuthUserHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProfile(data: { nickname?: string; avatar_url?: string }): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: "PATCH",
    headers: getAuthUserHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/password`, {
    method: "POST",
    headers: getAuthUserHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getSessions(): Promise<UserSession[]> {
  const res = await fetch(`${API_URL}/auth/sessions`, {
    headers: getAuthUserHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function revokeSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthUserHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_URL}/auth/account`, {
    method: "DELETE",
    headers: getAuthUserHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export type CreateSpaceResponse = {
  token: string;
  user_id: string;
  space_id: string;
  code: string;
  name: string;
  is_public: boolean;
  is_creator: boolean;
};

export type PublicSpace = {
  id: string;
  code: string;
  name: string;
  member_count: number;
};

export type InvolveResponse = {
  token: string;
  user_id: string;
  space_id: string;
  space_name: string;
  nickname: string;
  is_creator: boolean;
};

export type ShotResponse = {
  id: string;
};

export type Shot = {
  id: string;
  user_id: string;
  nickname: string | null;
  content: string;
  sent_at: string;
  is_kicked: boolean;
};

export type SpaceUser = {
  id: string;
  nickname: string;
  is_creator: boolean;
  is_kicked: boolean;
  joined_at: string;
};

export type SpaceInfo = {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  is_creator: boolean;
  is_finished: boolean;
  ban_kicked_users: boolean;
};

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const stored = localStorage.getItem("user");
  if (!stored) throw new Error("Not authenticated");
  const { token } = JSON.parse(stored);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Public endpoints (no auth required)
export async function createSpace(name: string, isPublic: boolean, creatorNickname: string, autoFinishMinutes?: number | null): Promise<CreateSpaceResponse> {
  const res = await fetch(`${API_URL}/space`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      is_public: isPublic,
      creator_nickname: creatorNickname,
      auto_finish_minutes: autoFinishMinutes ?? null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPublicSpaces(): Promise<PublicSpace[]> {
  const res = await fetch(`${API_URL}/space/public`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function joinSpace(code: string, nickname: string): Promise<InvolveResponse> {
  const res = await fetch(`${API_URL}/involve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, nickname }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Protected endpoints (auth required)
export async function sendShot(content: string, showNickname: boolean): Promise<ShotResponse> {
  const res = await fetch(`${API_URL}/shot`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, show_nickname: showNickname }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSpace(id: string): Promise<SpaceInfo> {
  const res = await fetch(`${API_URL}/space/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getShots(spaceId: string): Promise<Shot[]> {
  const res = await fetch(`${API_URL}/space/${spaceId}/shots`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateSpace(id: string, name: string): Promise<SpaceInfo> {
  const res = await fetch(`${API_URL}/space/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSpace(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/space/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function leaveSpace(): Promise<void> {
  const res = await fetch(`${API_URL}/involve`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

// History endpoints
export type HistorySpace = {
  id: string;
  name: string;
  shot_count: number;
  is_public: boolean;
};

export type SpaceHistory = {
  id: string;
  name: string;
  shots: Shot[];
};

// Public history (no auth required)
export async function getHistorySpaces(): Promise<HistorySpace[]> {
  const res = await fetch(`${API_URL}/space/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSpaceHistory(id: string): Promise<SpaceHistory> {
  const res = await fetch(`${API_URL}/space/${id}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// User's history (auth required)
export async function getMyHistorySpaces(): Promise<HistorySpace[]> {
  const res = await fetch(`${API_URL}/space/my-history`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMySpaceHistory(id: string): Promise<SpaceHistory> {
  const res = await fetch(`${API_URL}/space/${id}/my-history`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Space users endpoints
export async function getSpaceUsers(spaceId: string): Promise<SpaceUser[]> {
  const res = await fetch(`${API_URL}/space/${spaceId}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function kickUser(spaceId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/space/${spaceId}/kick/${userId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateBanSetting(spaceId: string, banKickedUsers: boolean): Promise<SpaceInfo> {
  const res = await fetch(`${API_URL}/space/${spaceId}/ban-setting`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ban_kicked_users: banKickedUsers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
