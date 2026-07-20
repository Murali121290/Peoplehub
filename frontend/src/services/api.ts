import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// Use environment variable with /api suffix, or fallback to relative path
const API_URL = `${import.meta.env.VITE_API_URL || ""}/api`;

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type QueryParams = Record<string, any>;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token");

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const status = error.response?.status;
        const serverMessage =
          error.response?.data?.message || error.response?.data?.error;

        if (status === 401) {
          useAuthStore.getState().logout();
          toast.error(serverMessage || "Session expired. Please login again.");
        } else if (status === 403) {
          toast.error(serverMessage || "Access denied.");
        } else if (status === 404) {
          toast.error(serverMessage || "Requested resource not found.");
        } else if (status === 422) {
          toast.error(serverMessage || "Validation failed.");
        } else if (status === 500) {
          toast.error(serverMessage || "Server error. Please try again.");
        }

        return Promise.reject(error);
      },
    );
  }

  private jsonHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  private multipartHeaders() {
    return {
      "Content-Type": "multipart/form-data",
    };
  }

  // ================= AUTH =================

  async login(credentials: LoginCredentials) {
    return this.api.post("/auth/login", credentials, {
      headers: this.jsonHeaders(),
    });
  }

  async logout() {
    return this.api.post("/auth/logout");
  }

  async getCurrentUser() {
    return this.api.get("/auth/me");
  }

  // ================= USERS =================

  async getUsers(params?: QueryParams) {
    return this.api.get("/users", { params });
  }

  async createUser(data: any) {
    return this.api.post("/users", data, {
      headers: this.jsonHeaders(),
    });
  }



  async updateUser(id: number, data: any) {
    return this.api.put(`/users/${id}`, data, {
      headers: this.jsonHeaders(),
    });
  }

  async deleteUser(id: number) {
    return this.api.delete(`/users/${id}`);
  }

  async getRoles() {
    return this.api.get("/users/roles");
  }
  async getRolesByTeam(teamId: number) {
    return this.api.get(`/users/roles/${teamId}`);
  }

  async getTeams() {
    return this.api.get("/users/teams");
  }

  async getTeamOverview() {
    return this.api.get("/employees/team-overview");
  }



  // ================= COMMON METHODS =================

async get(url: string, config?: any) {
  return this.api.get(url, config);
}

async post(url: string, data?: any, config?: any) {
  return this.api.post(url, data, config);
}

async put(url: string, data?: any, config?: any) {
  return this.api.put(url, data, config);
}

async delete(url: string, config?: any) {
  return this.api.delete(url, config);
}
}

export const apiService = new ApiService();

// ================= AUTH SERVICE =================

export const authService = {
  login: (credentials: LoginCredentials) => apiService.login(credentials),
  logout: () => apiService.logout(),
  getCurrentUser: () => apiService.getCurrentUser(),
};

// ================= USER SERVICE =================

export const userService = {
  getUsers: (params?: QueryParams) => apiService.getUsers(params),
  createUser: (data: any) => apiService.createUser(data),
  updateUser: (id: number, data: any) => apiService.updateUser(id, data),
  deleteUser: (id: number) => apiService.deleteUser(id),

  getRoles: () => apiService.getRoles(),

  getRolesByTeam: (teamId: number) => apiService.getRolesByTeam(teamId),

  getTeams: () => apiService.getTeams(),

  getTeamOverview: () => apiService.getTeamOverview(),
};


export const appraisalService = {
  getAppraisalHistory: (employeeId: string) =>
    apiService.get(`/appraisal/history/${employeeId}`),
  getEmployeeAppraisal: (employeeId: string) =>
    apiService.get(`/appraisal/employee/${employeeId}`),
};

export default apiService;
