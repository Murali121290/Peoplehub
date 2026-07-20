import React, { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { FormField, Input, Textarea, Select } from "../../../components/ui/Form";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { apiService } from "../../../services/api";
import { toast } from "react-hot-toast";

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isEdit?: boolean;
  teamData?: any;
}

interface RoleInput {
  id?: number;
  name: string;
  description: string;
}

export const AddTeamModal: React.FC<AddTeamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isEdit = false,
  teamData,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflowStage, setWorkflowStage] = useState("Project Management");
  const [roles, setRoles] = useState<RoleInput[]>([{ name: "", description: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && teamData) {
      setName(teamData.name || "");
      setDescription(teamData.description || "");
      setWorkflowStage(teamData.workflow_stage || "Project Management");

      // Fetch all roles for this team
      apiService
        .getRolesByTeam(teamData.id)
        .then((res) => {
          const fetchedRoles = res.data.roles || [];
          if (fetchedRoles.length > 0) {
            setRoles(
              fetchedRoles.map((r: any) => ({
                id: r.id,
                name: r.name,
                description: r.description || "",
              }))
            );
          } else {
            setRoles([{ name: "", description: "" }]);
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load team roles");
        });
    } else {
      setName("");
      setDescription("");
      setWorkflowStage("Project Management");
      setRoles([{ name: "", description: "" }]);
    }
  }, [isOpen, isEdit, teamData]);

  const handleAddRole = () => {
    setRoles([...roles, { name: "", description: "" }]);
  };

  const handleRemoveRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const handleRoleChange = (index: number, field: keyof RoleInput, value: string) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], [field]: value };
    setRoles(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Team name is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out empty roles
      const filteredRoles = roles.filter((r) => r.name.trim() !== "");

      const payload = {
        name,
        description,
        workflow_stage: workflowStage,
        roles: filteredRoles,
      };

      if (isEdit && teamData) {
        await apiService.updateTeam(teamData.id, payload);
        toast.success("Team and roles updated successfully");
      } else {
        await apiService.createTeam(payload);
        toast.success("Team and roles created successfully");
      }
      
      // Reset form fields
      setName("");
      setDescription("");
      setWorkflowStage("Project Management");
      setRoles([{ name: "", description: "" }]);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || (isEdit ? "Failed to update team" : "Failed to create team");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title={isEdit ? "Edit Team" : "Create New Team"}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Team")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="TEAM NAME *">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({});
            }}
            placeholder="e.g., Development, Marketing"
            required
            className={errors.name ? "border-danger-500" : ""}
          />
          {errors.name && <p className="text-danger-600 text-xs mt-1">{errors.name}</p>}
        </FormField>

        <FormField label="DESCRIPTION">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the team's primary function (optional)"
          />
        </FormField>

        <FormField label="WORKFLOW STAGE">
          <Select
            value={workflowStage}
            onChange={(val) => setWorkflowStage(val)}
            options={[
              { label: "Project Management", value: "Project Management" },
              { label: "Editorial", value: "Editorial" },
              { label: "Production", value: "Production" },
              { label: "Template", value: "Template" },
              { label: "Graphics", value: "Graphics" },
              { label: "XML Conversion", value: "XML Conversion" },
              { label: "Non-XML Conversion", value: "Non-XML Conversion" },
              { label: "Accessibility", value: "Accessibility" },
              { label: "Index", value: "Index" },
              { label: "Design", value: "Design" },
            ]}
          />
        </FormField>

        <div className="border-t border-neutral-200 pt-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-neutral-800 text-xs tracking-wider uppercase">TEAM ROLES</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleAddRole}
            >
              <PlusIcon className="w-3.5 h-3.5" /> Add Role
            </Button>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {roles.map((role, index) => (
              <div key={index} className="flex gap-3 items-start bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                <div className="flex-1 space-y-2">
                  <Input
                    value={role.name}
                    onChange={(e) => handleRoleChange(index, "name", e.target.value)}
                    placeholder="Role Title (e.g., Lead Developer)"
                    className="bg-white"
                  />
                  <Input
                    value={role.description}
                    onChange={(e) => handleRoleChange(index, "description", e.target.value)}
                    placeholder="Description (Optional)"
                    className="bg-white text-xs"
                  />
                </div>
                {roles.length > 1 && (
                  <button
                    type="button"
                    className="text-neutral-400 hover:text-danger-600 mt-2.5 p-1 transition-colors"
                    onClick={() => handleRemoveRole(index)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddTeamModal;
