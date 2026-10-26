interface AuthResponse {
  headers: {
    "set-cookie"?: string[] | string;
  };
}

export function extractAuthToken(response: AuthResponse): string {
  const setCookies = response.headers["set-cookie"];
  const cookies = Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [];
  const authCookie = cookies.find((cookie) => cookie.startsWith("token="));
  const token = authCookie?.slice("token=".length).split(";")[0];

  if (!token) {
    throw new Error("Authentication response did not include the HttpOnly token cookie.");
  }

  return decodeURIComponent(token);
}
