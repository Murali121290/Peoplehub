import { API_URL } from "../../../config/api";
import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { FormField, Input, Select } from "../../../components/ui/Form";

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

    const requiredFields = [
      "employee_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "joining_date",
      "salary",
      "team_id",
      "reporting_manager",
      "role",
      "status",
    ];

    for (const field of requiredFields) {
      console.log(field, "=", newEmp[field]);

      if (
        newEmp[field] === undefined ||
        newEmp[field] === null ||
        newEmp[field] === ""
      ) {
        setIsEmptyField(true);

        return;
      }
    }

    console.log("PROFILE IMAGE =", profileImage);

    if (!isEdit && !profileImage) {
      setIsEmptyField(true);
      return;
    }

    console.log("ALL VALID");

    setIsEmptyField(false);

    console.log("NEW EMP =", newEmp);

    onSubmit(e);
  };

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
              label: "EMPLOYEE ID *",
              key: "employee_id",
              placeholder: "e.g., EMP001",
            },
            {
              label: "FIRST NAME *",
              key: "first_name",
              placeholder: "e.g., John",
            },
            {
              label: "LAST NAME *",
              key: "last_name",
              placeholder: "e.g., Smith",
            },
            {
              label: "EMAIL *",
              key: "email",
              placeholder: "e.g., john@company.com",
              type: "email",
            },
            {
              label: "PHONE *",
              key: "phone",
              placeholder: "e.g., +91 9876543210",
            },
            { label: "JOINING DATE *", key: "joining_date", type: "date" },
            {
              label: "SALARY *",
              key: "salary",
              placeholder: "e.g., 150000",
              type: "number",
            },
          ].map((field) => (
            <FormField key={field.key} label={field.label}>
              <Input
                required
                type={field.type || "text"}
                value={newEmp[field.key]}
                onChange={(e) =>
                  setNewEmp({ ...newEmp, [field.key]: e.target.value })
                }
                placeholder={field.placeholder || ""}
              />
            </FormField>
          ))}

          <FormField label="Designation *">
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
                  designation: selectedTeam?.name || "",

                  role: "",
                  role_id: "",
                });
              }}
              placeholder="Select Team"
              options={(teams || []).map((team) => ({ label: team.name, value: team.id }))}
            />
          </FormField>

          <FormField label="REPORTING MANAGER *">
            <Select
              value={newEmp.reporting_manager}
              onChange={(value) =>
                setNewEmp({ ...newEmp, reporting_manager: value })
              }
              placeholder="Select Manager"
              options={(employees || []).map((emp) => ({
                label: `${emp.first_name} ${emp.last_name}`,
                value: `${emp.first_name} ${emp.last_name}`,
              }))}
            />
          </FormField>

          <FormField label="Role *">
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
                });
              }}
              placeholder="Select Role"
              options={(filteredRoles || []).map((role) => ({
                label: role.name,
                value: role.name,
              }))}
            />
          </FormField>

          <FormField label="STATUS *">
            <Select
              value={newEmp.status}
              onChange={(value) =>
                setNewEmp({ ...newEmp, status: value })
              }
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
                { label: "On Leave", value: "On Leave" },
              ]}
            />
          </FormField>

          <FormField
            label={isEdit ? "PROFILE IMAGE" : "PROFILE IMAGE *"}
          >
            <Input
              type="file"
              accept="image/*"
              onChange={(e: any) => setProfileImage(e.target.files[0])}
              required
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
};

export default AddEmployeeModal;
