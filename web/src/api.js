export const TOKEN_KEY = "campus_token";

export async function authenticatedFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "omit",
  });
  if (response.status === 401 && path !== "/api/login") {
    sessionStorage.removeItem(TOKEN_KEY);
    location.replace("/login");
  }
  return response;
}

export async function api(path, options = {}) {
  const response = await authenticatedFetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求没有完成，请稍后重试");
  return data;
}
