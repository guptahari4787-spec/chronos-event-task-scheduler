const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://api.chronos.localhost:2345/api";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryToken = urlParams.get("token");
      if (queryToken) {
        this.token = queryToken;
        sessionStorage.setItem("chronos_token", queryToken);
        localStorage.setItem("chronos_token", queryToken);
      } else {
        this.token = sessionStorage.getItem("chronos_token") || localStorage.getItem("chronos_token");
      }
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      sessionStorage.setItem("chronos_token", token);
      localStorage.setItem("chronos_token", token);
    } else {
      sessionStorage.removeItem("chronos_token");
      localStorage.removeItem("chronos_token");
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      const error: any = new Error(errorData.message || "An API error occurred");
      error.status = response.status;
      error.details = errorData;
      throw error;
    }

    return response.json();
  }

  public get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
export { API_BASE_URL };
