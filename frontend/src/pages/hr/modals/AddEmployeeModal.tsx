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
    ...(!isEdit ? ["password"] : []),
    "access_level",
    "shift_timing",
  ];

  const getLabel = (fieldKey: string, baseLabel: string) => {
    const isRequired = requiredFields.includes(fieldKey);
    return `${baseLabel.trim()}${isRequired ? " *" : ""}`;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/shifts/options`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data
            .filter((s: string) => s.toUpperCase() !== "WFH" && s.toLowerCase() !== "work from home")
            .map((s: string) => ({ label: s, value: s }));
          setShiftOptions(opts);
        } else {
          setShiftOptions([
            { label: "General Shift", value: "General Shift" },
            { label: "Morning Shift", value: "Morning Shift" },
            { label: "Evening Shift", value: "Evening Shift" },
            { label: "Night Shift", value: "Night Shift" },
          ]);
        }
      })
      .catch((err) => {
        console.error(err);
        setShiftOptions([
          { label: "General Shift", value: "General Shift" },
          { label: "Morning Shift", value: "Morning Shift" },
          { label: "Evening Shift", value: "Evening Shift" },
          { label: "Night Shift", value: "Night Shift" },
        ]);
      });
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

    const errors: Record<string, boolean> = {};

    for (const field of requiredFields) {

      if (
        newEmp[field] === undefined ||
        newEmp[field] === null ||
        newEmp[field] === ""
      ) {
        errors[field] = true;
      }
    }




    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsEmptyField(true);
      return;
    }


    setFieldErrors({});
    setIsEmptyField(false);


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
                    emp.access_level?.toLowerCase() === "hr" ||
                    emp.access_level?.toLowerCase() === "admin"
                )
                .map((emp) => ({
                  label: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
                  value: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
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

          <FormField label={getLabel("profile_image", "PROFILE IMAGE")}>
            <Input
              type="file"
              accept="image/*"
              onChange={(e: any) => {
                setProfileImage(e.target.files[0]);
                clearError("profile_image");
              }}
              className={fieldErrors["profile_image"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="profile_image" />
          </FormField>

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

          {!isEdit && (
            <FormField label={getLabel("password", "Default Password")}>
              <Input
                required={!isEdit}
                type="text"
                value="Welcome_PeopleHub"
                disabled={true}
                className="bg-neutral-100 text-neutral-500 cursor-not-allowed"
                onChange={() => {}}
              />
              <p className="text-xs text-neutral-400 mt-1">This default password will be assigned to the new user.</p>
            </FormField>
          )}

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

          <FormField label={getLabel("work_mode", "Work Mode")}>
            <Select
              value={newEmp.work_mode || "Office"}
              onChange={(value) => {
                setNewEmp({
                  ...newEmp,
                  work_mode: value,
                });
                clearError("work_mode");
              }}
              options={[
                { label: "Office", value: "Office" },
                { label: "WFH", value: "WFH" },
                { label: "Hybrid", value: "Hybrid" },
              ]}
              className={fieldErrors["work_mode"] ? "border-danger-500" : ""}
            />
            <FieldError fieldKey="work_mode" />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};

export default AddEmployeeModal;