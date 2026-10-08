export const login = async (username: string, password: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
        body: JSON.stringify({ username, password }),
    });
    const data: { access_token?: string; detail?: string } = await response.json();
    if (!response.ok || !data.access_token) {
      throw new Error(data.detail || `Login failed: ${response.status}`);
    }
    return data.access_token;
}

export const getUser = async (token: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const user = await response.json();
    if (!response.ok) {
      throw new Error(user?.detail || `Failed to fetch user: ${response.status}`);
    }
    return user;
}