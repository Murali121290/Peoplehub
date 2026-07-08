import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { API_URL as CONFIG_API_URL } from "../config/api";

const API_URL = import.meta.env.VITE_API_URL || (CONFIG_API_URL ? `${CONFIG_API_URL}/api` : "/api");

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

  async deactivateProject(projectId: number) {
    return this.api.post(`/projects/${projectId}/deactivate`);
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

  // ================= CLIENTS =================

  async getClients(params?: QueryParams) {
    return this.api.get("/clients", { params });
  }

  async createClient(data: any) {
    return this.api.post("/clients", data, {
      headers: this.jsonHeaders(),
    });
  }

  async updateClient(id: number, data: any) {
    return this.api.put(`/clients/${id}`, data, {
      headers: this.jsonHeaders(),
    });
  }

  async deleteClient(id: number) {
    return this.api.delete(`/clients/${id}`);
  }

  async getClient(id: number) {
    return this.api.get(`/clients/${id}`);
  }

  // ================= PROJECTS =================

  async getProjects(params?: QueryParams) {
    return this.api.get("/projects", { params });
  }

  async createProject(data: any) {
    return this.api.post("/projects", data, {
      headers: this.jsonHeaders(),
    });
  }

  async getProject(id: number) {
    return this.api.get(`/projects/${id}`);
  }

  async activateProject(projectId: number, workflowId: string) {
    return this.api.post(`/projects/${projectId}/activate`, {
      workflow_id: workflowId,
    });
  }

  async uploadChapters(projectId: number, file: File) {
    const formData = new FormData();
    formData.append("zip_file", file);

    return this.api.post(`/projects/${projectId}/chapters/upload`, formData, {
      headers: this.multipartHeaders(),
    });
  }

  async parseChapterZip(file: File) {
    const formData = new FormData();
    formData.append("zip_file", file);

    return this.api.post("/projects/parse-zip", formData, {
      headers: this.multipartHeaders(),
    });
  }

  async createProjectWithChapters(payload: any, zipFile: File) {
    const formData = new FormData();
    formData.append("zip_file", zipFile);
    formData.append("payload", JSON.stringify(payload));

    return this.api.post("/projects/create-with-chapters", formData, {
      headers: this.multipartHeaders(),
    });
  }

  async updateProject(id: number, data: any) {
    return this.api.put(`/projects/${id}`, data, {
      headers: this.jsonHeaders(),
    });
  }

  async deleteProject(id: number) {
    return this.api.delete(`/projects/${id}`);
  }

  async completeStage(projectId: number, data: any) {
    return this.api.post(`/projects/${projectId}/complete-stage`, data, {
      headers: this.jsonHeaders(),
    });
  }

  async getProjectChapters(projectId: number) {
    return this.api.get(`/projects/${projectId}/chapters`);
  }

  async updateProjectChapter(projectId: number, chapterId: number, data: any) {
    return this.api.put(`/projects/${projectId}/chapters/${chapterId}`, data, {
      headers: this.jsonHeaders(),
    });
  }

  async deleteProjectChapter(projectId: number, chapterId: number) {
    return this.api.delete(`/projects/${projectId}/chapters/${chapterId}`);
  }

  // ================= DASHBOARD =================

  async getDashboardStats() {
    return this.api.get("/dashboard/stats");
  }

  async getWorkflowStats() {
    return this.api.get("/dashboard/workflow-stats");
  }

  // ================= WORKFLOWS =================

  async getWorkflows() {
    return this.api.get("/workflow");
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
};

// ================= CLIENT SERVICE =================

export const clientService = {
  getClients: (params?: QueryParams) => apiService.getClients(params),
  createClient: (data: any) => apiService.createClient(data),
  updateClient: (id: number, data: any) => apiService.updateClient(id, data),
  deleteClient: (id: number) => apiService.deleteClient(id),
  getClient: (id: number) => apiService.getClient(id),
};

// ================= PROJECT SERVICE =================

export const projectService = {
  getProjects: (params?: QueryParams) => apiService.getProjects(params),

  createProject: (data: any) => apiService.createProject(data),

  getProject: (id: number) => apiService.getProject(id),

  activateProject: (projectId: number, workflowId: string) =>
    apiService.activateProject(projectId, workflowId),

  uploadChapters: (projectId: number, file: File) =>
    apiService.uploadChapters(projectId, file),

  parseChapterZip: (file: File) => apiService.parseChapterZip(file),

  createProjectWithChapters: (payload: any, zipFile: File) =>
    apiService.createProjectWithChapters(payload, zipFile),

  updateProject: (id: number, data: any) => apiService.updateProject(id, data),

  deleteProject: (id: number) => apiService.deleteProject(id),

  completeStage: (projectId: number, data: any) =>
    apiService.completeStage(projectId, data),

  getProjectChapters: (projectId: number) =>
    apiService.getProjectChapters(projectId),

  updateProjectChapter: (projectId: number, chapterId: number, data: any) =>
    apiService.updateProjectChapter(projectId, chapterId, data),

  deleteProjectChapter: (projectId: number, chapterId: number) =>
    apiService.deleteProjectChapter(projectId, chapterId),
};

// ================= DASHBOARD SERVICE =================

export const dashboardService = {
  getDashboardStats: () => apiService.getDashboardStats(),
  getWorkflowStats: () => apiService.getWorkflowStats(),
};

export const workflowService = {
  getWorkflows: () => apiService.getWorkflows(),
};

export default apiService;
