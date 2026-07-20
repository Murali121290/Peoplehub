export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  role_id: number;
  role_name?: string;
  team: string;
  team_id: number;
  team_name?: string;
  access_level: string;
  status: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  company_email?: string;
  employee_id?: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface Team {
  id: number;
  name: string;
}



export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserFormData {
  full_name: string;
  email: string;
  password: string;
  role_id: number;
  team_id: number;
  access_level: string;
  status: string;
}

export interface CreateClientFormData {
  category: string;
  type: string;
  email: string;
  website: string;
  designation: string;
  department: string;
  division: string;
  vendor_number: string;
  address_line_1: string;
  address_line_2: string;
  country: string;
  state: string;
  city: string;
  zip_code: string;
  working_hours: string;
  contact_hours: string;
  sub_specialization: string;
}
