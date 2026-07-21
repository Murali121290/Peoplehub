import { API_URL } from "../../../config/api";
import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { FormField, Input, Select } from "../../../components/ui/Form";
import { DatePicker } from "../../../components/ui/DatePicker";

interface AddEmployeeModalProps {
  newEmp: any;
  setNewEmp: (val: any) => void;
  employees: any[];
  teams: any[];
  roles: any[];
  profileImage: any;
  setProfileImage: (val: any) => void;
  onSubmit: (e: any) => void;
  onClose: () => void;

  // ADD THESE
  isEdit?: boolean;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  newEmp,
  setNewEmp,
  employees,
  teams,
  roles,
  profileImage,
  setProfileImage,
  onSubmit,
  onClose,
  isEdit = false,
}) => {
  const [filteredRoles, setFilteredRoles] = useState<any[]>([]);
  const [isEmptyField, setIsEmptyField] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [shiftOptions, setShiftOptions] = useState<{ label: string; value: string }[]>([]);

  const requiredFields = [
    "employee_id",
    "first_name",
    "email",
    "joining_date",
    "team_id",
    "designation",
    "status",
    "company_email",
    "password",
    "access_level",
    "shift_timing",
  ];

  const getLabel = (fieldKey: string, baseLabel: string) => {
    const isRequired = fieldKey === "profile_image" ? !isEdit : requiredFields.includes(fieldKey);
    return `${baseLabel.trim()}${isRequired ? " *" : ""}`;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/shifts/options`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShiftOptions(data.map((s: string) => ({ label: s, value: s })));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!newEmp.team_id) {
      setFilteredRoles([]);
      return;
    }

    fetch(`${API_URL}/api/employees/roles/${newEmp.team_id}`)
      .then((res) => res.json())
      .then((data) => {
        setFilteredRoles(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [newEmp.team_id]);

  const validateForm = (e: any) => {
    console.log("VALIDATE FORM CALLED");

    const errors: Record<string, boolean> = {};

    for (const field of requiredFields) {
      console.log(field, "=", newEmp[field]);

      if (
        newEmp[field] === undefined ||
        newEmp[field] === null ||
        newEmp[field] === ""
      ) {
        errors[field] = true;
      }
    }

    console.log("PROFILE IMAGE =", profileImage);

    // Profile image is only required when creating a new employee
    if (!isEdit && !profileImage) {
      errors["profile_image"] = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsEmptyField(true);
      return;
    }

    console.log("ALL VALID");

    setFieldErrors({});
    setIsEmptyField(false);

    console.log("NEW EMP =", newEmp);

    onSubmit(e);
  };

  // Helper: clear the error for a field as soon as the user fixes it
  const clearError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Small reusable error message shown under an invalid field
  const FieldError = ({ fieldKey }: { fieldKey: string }) =>
    fieldErrors[fieldKey] ? (
      <p className="text-danger-600 text-xs mt-1">This field is required.</p>
    ) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      className="max-w-[920px]"
      title={isEdit ? "Edit Employee" : "Add New Employee"}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={validateForm}>
            {isEdit ? "Update Employee" : "Add Employee"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-neutral-500 -mt-3 mb-5">
        {isEdit
          ? "Update employee information."
          : "HR can create a new employee record with essential details"}
      </p>

      <form>
        {isEmptyField && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
            ⚠️ Please fill all mandatory fields{!isEdit && " including Profile Image"} before {isEdit ? "updating" : "adding"} employee.
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {[
            {
              label: "EMPLOYEE ID",
              key: "employee_id",
              placeholder: "e.g., EMP001",
            },
            {
              label: "FIRST NAME",
              key: "first_name",
              placeholder: "e.g., John",
            },
            {
              label: "LAST NAME",
              key: "last_name",
              placeholder: "e.g., Smith",
            },
            {
              label: "EMAIL",
              key: "email",
              placeholder: "e.g., john@company.com",
              type: "email",
            },
            {
              label: "PHONE",
              key: "phone",
              placeholder: "e.g., +91 9876543210",
            },
            { label: "JOINING DATE", key: "joining_date", type: "date" },
            {
              label: "SALARY",
              key: "salary",
              placeholder: "e.g., 150000",
              type: "number",
            },
          ].map((field) => (
            <FormField key={field.key} label={getLabel(field.key, field.label)}>
              {field.type === "date" ? (
                <DatePicker
                  value={newEmp[field.key] || ""}
                  onChange={(val) => {
                    setNewEmp({ ...newEmp, [field.key]: val });
                    clearError(field.key);
                  }}
                  error={fieldErrors[field.key]}
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Input
                  required
                  type={field.type || "text"}
                  value={newEmp[field.key]}
                  onChange={(e) => {
                    setNewEmp({ ...newEmp, [field.key]: e.target.value });
                    clearError(field.key);
                  }}
                  placeholder={field.placeholder || ""}
                  className={fieldErrors[field.key] ? "border-danger-500" : ""}
                />
              )}
              <FieldError fieldKey={field.key} />
            </FormField>
          ))}

          <FormField label={getLabel("team_id", "Team")}>
            <Select
              value={newEmp.team_id || ""}
              onChange={(value) => {
                const selectedTeam = teams.find(
                  (team) => team.id === Number(value),
                );

                setNewEmp({
                  ...newEmp,
                  team_id: value,
                  department: selectedTeam?.name || "",
                  role: "",
                  role_id: "",
                  designation: "",   // clear designation when team changes
                });
                clearError("team_id");
              }}
              placeholder="Select Team"
              options={(teams || []).map((team) => ({ label: team.name, value: team.id }))}
              className={fieldErrors["team_id"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="team_id" />
          </FormField>

          <FormField label={getLabel("reporting_manager", "REPORTING MANAGER")}>
            <Select
              value={newEmp.reporting_manager}
              onChange={(value) => {
                setNewEmp({ ...newEmp, reporting_manager: value });
                clearError("reporting_manager");
              }}
              placeholder="Select Manager"
              options={(employees || [])
                .filter(
                  (emp) =>
                    emp.access_level?.toLowerCase() === "manager" ||
                    emp.access_level?.toLowerCase() === "hr"
                )
                .map((emp) => ({
                  label: `${emp.first_name} ${emp.last_name}`,
                  value: `${emp.first_name} ${emp.last_name}`,
                }))}
              className={fieldErrors["reporting_manager"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="reporting_manager" />
          </FormField>

          <FormField label={getLabel("designation", "Designation")}>
            <Select
              value={newEmp.role}
              onChange={(value) => {
                const selectedRole = filteredRoles.find(
                  (r) => r.name === value
                );

                setNewEmp({
                  ...newEmp,
                  role: value,
                  role_id: selectedRole?.id || "",
                  designation: value,   // auto-set designation = role name
                });
                clearError("designation");
              }}
              placeholder="Select Designation"
              options={(filteredRoles || []).map((role) => ({
                label: role.name,
                value: role.name,
              }))}
              className={fieldErrors["designation"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="designation" />
          </FormField>

          <FormField label={getLabel("status", "STATUS")}>
            <Select
              value={newEmp.status}
              onChange={(value) => {
                setNewEmp({ ...newEmp, status: value });
                clearError("status");
              }}
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
                { label: "On Leave", value: "On Leave" },
              ]}
              className={fieldErrors["status"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="status" />
          </FormField>

          {/* Profile Image: only shown when adding a NEW employee, hidden on edit */}
          {!isEdit && (
            <FormField label={getLabel("profile_image", "PROFILE IMAGE")}>
              <Input
                type="file"
                accept="image/*"
                onChange={(e: any) => {
                  setProfileImage(e.target.files[0]);
                  clearError("profile_image");
                }}
                required
                className={fieldErrors["profile_image"] ? "border-danger-500" : ""}
              />
              <FieldError fieldKey="profile_image" />
            </FormField>
          )}

          <FormField label={getLabel("company_email", "Company Email")}>
            <Input
              required
              type="email"
              value={newEmp.company_email || ""}
              placeholder="employee@s4carlile.com"
              onChange={(e) => {
                setNewEmp({
                  ...newEmp,
                  company_email: e.target.value,
                });
                clearError("company_email");
              }}
              className={fieldErrors["company_email"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="company_email" />
          </FormField>

          <FormField label={getLabel("password", "Password")}>
            <Input
              required
              type="password"
              value={newEmp.password || ""}
              placeholder="Enter Password"
              onChange={(e) => {
                setNewEmp({
                  ...newEmp,
                  password: e.target.value,
                });
                clearError("password");
              }}
              className={fieldErrors["password"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="password" />
          </FormField>

          <FormField label={getLabel("access_level", "Access Level")}>
            <Select
              value={newEmp.access_level || ""}
              onChange={(value) => {
                setNewEmp({
                  ...newEmp,
                  access_level: value,
                });
                clearError("access_level");
              }}
              placeholder="Select Access Level"
              options={[
                { label: "Admin", value: "admin" },
                { label: "HR", value: "hr" },
                { label: "Manager", value: "manager" },
                { label: "User", value: "user" },
              ]}
              className={fieldErrors["access_level"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="access_level" />
          </FormField>

          <FormField label={getLabel("shift_timing", "Shift")}>
            <Select
              value={newEmp.shift_timing || ""}
              onChange={(value) => {
                setNewEmp({
                  ...newEmp,
                  shift_timing: value,
                });
                clearError("shift_timing");
              }}
              placeholder="Select Shift"
              options={
                shiftOptions.length > 0
                  ? shiftOptions
                  : [
                    { label: "General Shift", value: "General Shift" },
                    { label: "Morning Shift", value: "Morning Shift" },
                    { label: "Evening Shift", value: "Evening Shift" },
                    { label: "Night Shift", value: "Night Shift" },
                  ]
              }
              className={fieldErrors["shift_timing"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="shift_timing" />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};

export default AddEmployeeModal;