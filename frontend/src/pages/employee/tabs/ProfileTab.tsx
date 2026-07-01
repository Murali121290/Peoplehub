import React, { useEffect, useState } from "react";
import axios from "axios";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Form";

const BASE_URL = "http://localhost:5000/api";

const ProfileTab = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [profile, setProfile] = useState<any>({});

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employees/profile/${user.id}`);

      setProfile(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const updatePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/auth/change-password`, {
        user_id: user.id,
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      alert(res.data.message);

      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Password update failed");
    }
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Profile</h2>

        <p className="text-sm text-neutral-500">
          Manage your personal information
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.first_name?.charAt(0)}
              {profile.last_name?.charAt(0)}
            </div>

            <div>
              <h3 className="text-xl font-bold text-neutral-800">
                {profile.first_name} {profile.last_name}
              </h3>

              <p className="text-neutral-500">{profile.designation}</p>

              <p className="text-sm text-neutral-400">{profile.department}</p>

              <button className="mt-3 flex items-center gap-2 text-primary-600">
                <PencilIcon className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">Employee ID</label>

              <p className="text-neutral-800">{profile.employee_id}</p>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Department</label>

              <p className="text-neutral-800">{profile.department}</p>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Email</label>

              <p className="text-neutral-800">{profile.email}</p>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Phone</label>

              <p className="text-neutral-800">{profile.phone}</p>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Manager</label>

              <p className="text-neutral-800">{profile.reporting_manager}</p>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Joining Date</label>

              <p className="text-neutral-800">{profile.joining_date}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-neutral-800 mb-4">Quick Stats</h3>

          <div className="space-y-3">
            <div className="flex justify-between bg-neutral-50 p-3 rounded-lg text-neutral-700">
              <span>Department</span>
              <span>{profile.department}</span>
            </div>

            <div className="flex justify-between bg-neutral-50 p-3 rounded-lg text-neutral-700">
              <span>Designation</span>
              <span>{profile.designation}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">Change Password</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-neutral-700">Current Password</label>

            <Input
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-neutral-700">New Password</label>

            <Input
              type="password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-neutral-700">Confirm Password</label>

            <Input
              type="password"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handleChange}
            />
          </div>
        </div>

        <Button className="mt-4" onClick={updatePassword}>
          Update Password
        </Button>
      </Card>
    </>
  );
};

export default ProfileTab;
