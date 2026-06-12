const API_URL = "http://localhost:5000";

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch (err) {
    return null;
  }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    return Promise.reject(new Error(data.message || "Session expired"));
  }

  if (!res.ok) {
    return Promise.reject(new Error(data.message || "Request failed"));
  }

  return data;
}

export default API_URL;
