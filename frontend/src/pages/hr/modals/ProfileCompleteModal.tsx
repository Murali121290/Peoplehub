import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField, Input, Select, Textarea } from '../../../components/ui/Form';

interface ProfileCompleteModalProps {
  currentEmployee: any;
  profileData: any;
  setProfileData: (val: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const sectionTitleClass = "text-xs font-bold text-primary-600 mb-2.5";

const ProfileCompleteModal: React.FC<ProfileCompleteModalProps> = ({
  currentEmployee, profileData, setProfileData, onSubmit, onClose,
}) => {
  const upd = (key: string, val: string) => setProfileData({ ...profileData, [key]: val });

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title="Complete Your Profile"
      footer={
        <>
          <Button variant="outline" fullWidth onClick={onClose}>Skip for Now</Button>
          <Button fullWidth onClick={onSubmit}>Complete Profile</Button>
        </>
      }
    >
      <p className="text-xs text-neutral-500 -mt-3 mb-4">Welcome, {currentEmployee?.name}! Please fill the remaining details</p>

      <div className="flex flex-col gap-3.5">

        {/* Personal Information */}
        <div className={sectionTitleClass}>PERSONAL INFORMATION</div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="DATE OF BIRTH *">
            <Input type="date" value={profileData.dob} onChange={(e) => upd("dob", e.target.value)} />
          </FormField>
          <FormField label="GENDER *">
            <Select
              value={profileData.gender}
              onChange={(value) => upd("gender", value)}
              placeholder="Select Gender"
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
                { label: "Other", value: "Other" },
              ]}
            />
          </FormField>
          <FormField label="MARITAL STATUS *">
            <Select
              value={profileData.marital_status}
              onChange={(value) => upd("marital_status", value)}
              placeholder="Select Status"
              options={[
                { label: "Single", value: "Single" },
                { label: "Married", value: "Married" },
                { label: "Divorced", value: "Divorced" },
                { label: "Widowed", value: "Widowed" },
              ]}
            />
          </FormField>
          <FormField label="BLOOD GROUP *">
            <Select
              value={profileData.blood_group}
              onChange={(value) => upd("blood_group", value)}
              placeholder="Select Blood Group"
              options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => ({ label: bg, value: bg }))}
            />
          </FormField>
        </div>

        {/* Address */}
        <div className={sectionTitleClass}>ADDRESS</div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="col-span-2">
            <FormField label="ADDRESS *">
              <Textarea value={profileData.address} onChange={(e) => upd("address", e.target.value)} rows={2} placeholder="Enter full address" />
            </FormField>
          </div>
          {[
            { label: "CITY *", key: "city" },
            { label: "STATE *", key: "state" },
            { label: "COUNTRY *", key: "country", placeholder: "e.g., India" },
            { label: "PINCODE *", key: "pincode", placeholder: "e.g., 600032" },
          ].map((f) => (
            <FormField key={f.key} label={f.label}>
              <Input value={profileData[f.key]} onChange={(e) => upd(f.key, e.target.value)} placeholder={f.placeholder || ""} />
            </FormField>
          ))}
        </div>

        {/* Identity Documents */}
        <div className={sectionTitleClass}>IDENTITY DOCUMENTS</div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="PAN NUMBER *">
            <Input value={profileData.pan_number} onChange={(e) => upd("pan_number", e.target.value.toUpperCase())} placeholder="e.g., ABCDE1234F" />
          </FormField>
          <FormField label="AADHAAR NUMBER *">
            <Input value={profileData.aadhaar_number} onChange={(e) => upd("aadhaar_number", e.target.value)} placeholder="e.g., 1234 5678 9012" />
          </FormField>
        </div>

        {/* Bank Details */}
        <div className={sectionTitleClass}>BANK DETAILS</div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="BANK NAME *">
            <Input value={profileData.bank_name} onChange={(e) => upd("bank_name", e.target.value)} placeholder="e.g., HDFC Bank" />
          </FormField>
          <FormField label="ACCOUNT NUMBER *">
            <Input value={profileData.account_number} onChange={(e) => upd("account_number", e.target.value)} placeholder="Enter account number" />
          </FormField>
          <div className="col-span-2">
            <FormField label="IFSC CODE *">
              <Input value={profileData.ifsc_code} onChange={(e) => upd("ifsc_code", e.target.value.toUpperCase())} placeholder="e.g., HDFC0001234" />
            </FormField>
          </div>
        </div>

        {/* Education */}
        <div className={sectionTitleClass}>EDUCATION</div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="QUALIFICATION *">
            <Select
              value={profileData.qualification}
              onChange={(value) => upd("qualification", value)}
              placeholder="Select Qualification"
              options={["10th", "12th", "Diploma", "B.E/B.Tech", "M.E/M.Tech", "MBA", "MCA", "B.Sc", "M.Sc", "B.Com", "M.Com", "PhD"].map((q) => ({ label: q, value: q }))}
            />
          </FormField>
          <FormField label="COLLEGE/UNIVERSITY *">
            <Input value={profileData.college} onChange={(e) => upd("college", e.target.value)} placeholder="e.g., Anna University" />
          </FormField>
          <FormField label="PASSING YEAR *">
            <Input type="number" value={profileData.passing_year} onChange={(e) => upd("passing_year", e.target.value)} placeholder="e.g., 2022" />
          </FormField>
        </div>

        {/* Skills */}
        <FormField label="SKILLS">
          <Textarea value={profileData.skills} onChange={(e) => upd("skills", e.target.value)} rows={2} placeholder="e.g., JavaScript, React, Node.js (comma separated)" />
        </FormField>

        {/* Emergency Contact */}
        <div className={sectionTitleClass}>EMERGENCY CONTACT</div>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="CONTACT NAME *">
            <Input value={profileData.emergency_contact_name} onChange={(e) => upd("emergency_contact_name", e.target.value)} placeholder="e.g., Parent/Spouse Name" />
          </FormField>
          <FormField label="CONTACT NUMBER *">
            <Input value={profileData.emergency_contact_number} onChange={(e) => upd("emergency_contact_number", e.target.value)} placeholder="e.g., +91 9876543210" />
          </FormField>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileCompleteModal;
