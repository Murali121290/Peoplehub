import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import { Client } from '../types/index';
import { Building2, Layers3, Users, Clock } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { FormField, Input, Select } from '../components/ui/Form';

interface ClientModalProps {
  client?: Client;
  onClose: (refresh?: boolean) => void;
}

type Tab = 'basic' | 'address' | 'hours';

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [categoryType, setCategoryType] = useState<string>(client?.client_type === 'Organization' ? 'Organization' : 'Person');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [company, setCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [division, setDivision] = useState('');
  const [vendorNumber, setVendorNumber] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [contactHours, setContactHours] = useState('');
  const [clientType, setClientType] = useState('');
  const [subSpecialization, setSubSpecialization] = useState('');

  useEffect(() => {
    if (client) {
      setCategoryType(client.client_type === 'Organization' ? 'Organization' : 'Person');
      setFirstName(client.first_name || '');
      setSurname(client.surname || '');
      setCompany(client.company || '');
      setClientEmail(client.email || '');
      setWebsite(client.website || '');
      setDesignation(client.designation || '');
      setDepartment(client.department || '');
      setDivision(client.division || '');
      setVendorNumber(client.vendor_number || '');
      setAddress1(client.address_line_1 || '');
      setAddress2(client.address_line_2 || '');
      setCountry(client.country || '');
      setState(client.state || '');
      setCity(client.city || '');
      setZipCode(client.zip_code || '');
      setWorkingHours(client.working_hours || '');
      setContactHours(client.contact_hours || '');
      setClientType(client.client_type || '');
      setSubSpecialization(client.sub_specialization || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBasicValid() || !isAddressValid() || !isHoursValid()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const formData = {
        category: categoryType,
        type: clientType,
        email: clientEmail,
        website,
        designation,
        department,
        division,
        vendor_number: vendorNumber,
        address_line_1: address1,
        address_line_2: address2,
        country,
        state,
        city,
        zip_code: zipCode,
        working_hours: workingHours,
        contact_hours: contactHours,
        sub_specialization: subSpecialization,
        status: 'active',
        first_name: categoryType === 'Person' ? firstName : undefined,
        surname: categoryType === 'Person' ? surname : undefined,
        company: categoryType === 'Organization' ? company : undefined,
      };

      if (client) {
        await apiService.updateClient(client.id, formData);
        toast.success('Client updated successfully');
      } else {
        await apiService.createClient(formData);
        toast.success('Client created successfully');
      }
      onClose(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (activeTab === 'basic' && isBasicValid()) {
      setActiveTab('address');
    } else if (activeTab === 'address' && isAddressValid()) {
      setActiveTab('hours');
    } else {
      toast.error('Please fill all required fields');
    }
  };

  const goPrevious = () => {
    if (activeTab === 'hours') {
      setActiveTab('address');
    } else if (activeTab === 'address') {
      setActiveTab('basic');
    }
  };

  const isBasicValid = () => {
    return (
      categoryType.trim() &&
      clientType.trim() &&
      clientEmail.trim() &&
      website.trim() &&
      designation.trim() &&
      department.trim() &&
      division.trim() &&
      vendorNumber.trim() &&
      (categoryType === 'Person' ? (firstName.trim() && surname.trim()) : company.trim())
    );
  };

  const isAddressValid = () => {
    return (
      address1.trim() &&
      address2.trim() &&
      country.trim() &&
      state.trim() &&
      city.trim() &&
      zipCode.trim()
    );
  };

  const isHoursValid = () => {
    return (
      workingHours.trim() &&
      contactHours.trim()
    );
  };

  const tabs = [
    { id: 'basic' as Tab, label: 'Basic Info', icon: Layers3 },
    { id: 'address' as Tab, label: 'Address', icon: Building2 },
    { id: 'hours' as Tab, label: 'Hours', icon: Clock },
  ];

  const tamilNaduCities = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi',
    'Karur', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Tiruppur', 'Gudiyatham',
    'Vaniyambadi', 'Tiruvannamalai', 'Virudhunagar',
  ];

  const stateOptions = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Puducherry',
  ];

  return (
    <Modal
      isOpen
      onClose={() => onClose(false)}
      className="max-w-5xl"
      eyebrow={{ icon: Building2, label: 'Contact Management' }}
      title={client ? 'Edit Contact Information' : 'Add Contact Information'}
      tabs={<Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as Tab)} />}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" type="button" onClick={goPrevious} disabled={activeTab === 'basic'}>
            Previous
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" type="button" onClick={() => onClose(false)}>
              Cancel
            </Button>
            {activeTab === 'hours' ? (
              <Button type="button" onClick={handleSubmit} loading={loading}>
                {loading ? 'Saving...' : (client ? 'Update Client' : 'Create Client')}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Next
              </Button>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {activeTab === 'basic' && (
            <>
              {/* CATEGORY & TYPE */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-md bg-secondary-100 p-2">
                    <Layers3 size={16} className="text-secondary-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800">Category & Type</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Category" required>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="Person"
                          checked={categoryType === "Person"}
                          onChange={(e) => setCategoryType(e.target.value)}
                          className="h-4 w-4 border-2 border-neutral-300 text-primary-500 focus:ring-primary-300"
                          required
                        />
                        <span className="text-sm text-neutral-700">Person</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="Organization"
                          checked={categoryType === "Organization"}
                          onChange={(e) => setCategoryType(e.target.value)}
                          className="h-4 w-4 border-2 border-neutral-300 text-primary-500 focus:ring-primary-300"
                          required
                        />
                        <span className="text-sm text-neutral-700">Organization</span>
                      </label>
                    </div>
                  </FormField>
                  <FormField label="Type" required>
                    <Select
                      value={clientType}
                      onChange={(value) => setClientType(value)}
                      placeholder="Select Type"
                      options={[
                        { label: 'Customer', value: 'Customer' },
                        { label: 'Vendor', value: 'Vendor' },
                        { label: 'Publisher', value: 'Publisher' },
                      ]}
                    />
                  </FormField>
                </div>
              </div>

              {/* NAME & COMPANY */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-md bg-success-100 p-2">
                    <Users size={16} className="text-success-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800">Name & Company</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryType === "Person" && (
                    <>
                      <FormField label="First Name" required>
                        <Input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          required
                        />
                      </FormField>
                      <FormField label="Surname" required>
                        <Input
                          type="text"
                          value={surname}
                          onChange={(e) => setSurname(e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </FormField>
                    </>
                  )}
                  {categoryType === "Organization" && (
                    <div className="md:col-span-2">
                      <FormField label="Organization Name" required>
                        <Input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Acme Publishing Corp"
                          required
                        />
                      </FormField>
                    </div>
                  )}
                  <FormField label="Email" required>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="contact@company.com"
                      required
                    />
                  </FormField>
                  <FormField label="Website" required>
                    <Input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      required
                    />
                  </FormField>
                  <FormField label="Designation" required>
                    <Input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Manager"
                      required
                    />
                  </FormField>
                  <FormField label="Department" required>
                    <Input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Sales"
                      required
                    />
                  </FormField>
                  <FormField label="Division" required>
                    <Input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="North America"
                      required
                    />
                  </FormField>
                  <FormField label="Vendor Number" required>
                    <Input
                      type="text"
                      value={vendorNumber}
                      onChange={(e) => setVendorNumber(e.target.value)}
                      placeholder="VEN-001"
                      required
                    />
                  </FormField>
                </div>
              </div>
            </>
          )}

          {activeTab === 'address' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-info-100 p-2">
                  <Building2 size={16} className="text-info-600" />
                </div>
                <h3 className="text-base font-bold text-neutral-800">Address</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormField label="Address Line 1" required>
                    <Input
                      type="text"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="123 Business Street"
                      required
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Address Line 2" required>
                    <Input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="Suite 100"
                      required
                    />
                  </FormField>
                </div>

                <FormField label="Country" required>
                  <Select
                    value={country}
                    onChange={(value) => { setCountry(value); setState(""); setCity(""); }}
                    placeholder="Select Country"
                    options={[{ label: 'India', value: 'India' }]}
                  />
                </FormField>

                <FormField label="State" required>
                  <Select
                    value={state}
                    onChange={(value) => { setState(value); setCity(""); }}
                    disabled={!country}
                    placeholder="Select State"
                    options={stateOptions.map((s) => ({ label: s, value: s }))}
                  />
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="City" required>
                    <Select
                      value={city}
                      onChange={(value) => setCity(value)}
                      disabled={!state}
                      placeholder="Select City"
                      options={state === 'Tamil Nadu' ? tamilNaduCities.map((c) => ({ label: c, value: c })) : []}
                    />
                  </FormField>
                </div>

                <FormField label="Zip Code" required>
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="600001"
                    required
                  />
                </FormField>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-warning-100 p-2">
                  <Clock size={16} className="text-warning-600" />
                </div>
                <h3 className="text-base font-bold text-neutral-800">Working Hours</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Working Hours" required>
                  <Input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="9:00 AM - 6:00 PM"
                    required
                  />
                </FormField>
                <FormField label="Contact Hours" required>
                  <Input
                    type="text"
                    value={contactHours}
                    onChange={(e) => setContactHours(e.target.value)}
                    placeholder="9:00 AM - 5:00 PM"
                    required
                  />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Sub-Specialization">
                    <Input
                      type="text"
                      value={subSpecialization}
                      onChange={(e) => setSubSpecialization(e.target.value)}
                      placeholder="e.g., Digital Publishing"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;
