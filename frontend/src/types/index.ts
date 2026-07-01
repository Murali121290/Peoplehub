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
  workflow_stage: string;
}

export interface Client {
  id: number;
  first_name?: string;
  surname?: string;
  company?: string;
  category: string;
  client_type: string;
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
  status: string;
  project_count: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  project_code: string;
  customer: string;
  customer_name: string;
  customer_contact: string;
  division_code: string;
  billing_location: string;
  category: string;
  sales_person: string;
  project_title: string;
  priority: string;
  complexity: string;
  edition: string;
  color: string;
  trim_size: string;
  copyright_year: string;
  manuscript_pages: number;
  estimated_pages: number;
  actual_pages: number;
  isbn_number: string;
  xml_standard: string;
  workflow_id: number;
  current_stage: string;
  status: string;
  created_at: string;
  activated_at: string | null;
  completed_at: string | null;
}

export interface WorkflowStage {
  id: number;
  name: string;
  order: number;
  description: string;
  sla_hours: number;
  is_active: boolean;
}

export interface ProjectChapter {
  id: number;
  chapter_number: number;
  chapter_title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: string;
  version: number;
  uploaded_at: string;
  completed_at: string | null;
}

export interface ProjectAssignment {
  id: number;
  project_id: number;
  assigned_user_id: number;
  workflow_stage: string;
  status: string;
  priority: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  comments: string;
}

export interface SLATracking {
  id: number;
  project_id: number;
  workflow_stage: string;
  sla_deadline: string;
  actual_completion: string | null;
  is_overdue: boolean;
  overdue_hours: number;
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

export interface CreateProjectFormData {
  project_code: string;
  customer: string;
  customer_name: string;
  customer_contact: string;
  division_code: string;
  billing_location: string;
  category: string;
  sales_person: string;
  project_title: string;
  priority: string;
  complexity: string;
  edition: string;
  color: string;
  trim_size: string;
  copyright_year: string;
  manuscript_pages: number;
  estimated_pages: number;
  actual_pages: number;
  isbn_number: string;
  xml_standard: string;
  workflow_id: number;
  client_id: number;
}