import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiService } from "../services/api";
import { User, Role, Team } from "../types/index";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { FormField, Input, Select } from "../components/ui/Form";
import { BASE_API_URL } from "../config/api";

interface UserModalProps {
  user: User | null;
  onClose: (refresh: boolean) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | string>("");
  const [formData, setFormData] = useState({
    employee_id: 0,
    full_name: "",
    email: "",
    password: "",
    company_email: "",
    role_id: 0 as number | string,
    team_id: 0 as number | string,
    access_level: "user",
    status: "active",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        employee_id: user.employee_id || 0,
        full_name: user.full_name,
        email: user.email,
        password: "",
        company_email: user.company_email || "",
        role_id: user.role_id,
        team_id: user.team_id || 0,
        access_level: user.access_level,
        status: user.status,
      });
    }
    fetchRolesAndTeams();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const apiUrl = `${BASE_API_URL}/api`;
      const response = await fetch(`${apiUrl}/employees/`);

      const data = await response.json();


      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEmployees([]);
    }
  };

  const fetchRolesAndTeams = async () => {
    try {
      const [rolesRes, teamsRes] = await Promise.all([
        apiService.getRoles(),
        apiService.getTeams(),
      ]);
      setRoles(rolesRes.data.roles);
      setTeams(teamsRes.data.teams);
    } catch (error) {
      console.error("Failed to fetch roles/teams");
    }
  };

  const handleTeamChange = async (teamId: string) => {
    setFormData({
      ...formData,
      team_id: teamId,
      role_id: "",
    });

    try {
      const response = await apiService.getRolesByTeam(Number(teamId));

      setRoles(response.data.roles);
      setRoles(response.data.roles);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        await apiService.updateUser(user.id, formData);
        toast.success("User updated successfully");
      } else {
        if (!formData.password) {
          toast.error("Password is required for new users");
          setLoading(false);
          return;
        }
        await apiService.createUser(formData);
        toast.success("User created successfully");
      }
      onClose(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = Number(e.target.value);

    setSelectedEmployee(employeeId);

    const employee = employees.find((emp: any) => emp.id === employeeId);

    if (!employee) return;

    const selectedRole = roles.find((role: any) => role.name === employee.role);

    const selectedTeam = teams.find(
      (team: any) => team.name === employee.designation,
    );

    setFormData({
      ...formData,

      employee_id: employee.id,

      full_name: `${employee.first_name} ${employee.last_name}`,

      email: employee.email,

      role_id: selectedRole ? selectedRole.id : "",

      team_id: selectedTeam ? selectedTeam.id : "",
    });
  };

  return (
    <Modal
      isOpen
      onClose={() => onClose(false)}
      size="lg"
      title={user ? "Edit User" : "Create New User"}
    >
      <p className="-mt-3 mb-5 text-sm text-neutral-500">
        Fill in the employee access and account details below
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-primary-50 p-4">
          <FormField label="Select Employee">
            <Select
              value={selectedEmployee}
              onChange={(value) =>
                handleEmployeeSelect({
                  target: { value },
                } as React.ChangeEvent<HTMLSelectElement>)
              }
              placeholder="Select Employee"
              options={employees.map((emp: any) => ({
                label: `${emp.first_name} ${emp.last_name}`,
                value: emp.id,
              }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label="Full Name" required>
            <Input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Enter full name"
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Enter email"
            />
          </FormField>

          <FormField label="Company Email" required>
            <Input
              type="email"
              required
              value={formData.company_email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company_email: e.target.value,
                })
              }
              placeholder="employee@s4carlisle.com"
            />
          </FormField>

          <FormField label={`Password ${!user ? "*" : ""}`}>
            <Input
              type="password"
              required={!user}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder={
                user ? "Leave blank to keep same" : "Enter password"
              }
            />
          </FormField>

          <FormField label="Team" required>
            <Select
              value={formData.team_id}
              onChange={(value) => handleTeamChange(value)}
              placeholder="Select Team"
              options={teams.map((team) => ({
                label: team.name,
                value: team.id,
              }))}
            />
          </FormField>

          <FormField label="Role" required>
            <Select
              value={formData.role_id}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  role_id: value,
                })
              }
              placeholder="Select Role"
              options={roles.map((role: any) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </FormField>

          <FormField label="Access Level">
            <Select
              value={formData.access_level}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  access_level: value,
                })
              }
              options={[
                { label: "User", value: "user" },
                { label: "Manager", value: "manager" },
                { label: "HR", value: "hr" },
                { label: "Admin", value: "admin" },
              ]}
            />
          </FormField>

          <FormField label="Status">
            <Select
              value={formData.status}
              onChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-5">
          <Button type="button" variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? "Saving..." : user ? "Update User" : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
