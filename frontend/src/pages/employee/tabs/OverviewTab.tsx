import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coffee, UtensilsCrossed } from "lucide-react";
import { API_URL } from "../../../config/api";

interface OverviewTabProps {
  currentEmployee: any;
  user: any;
  itemVariants: any;
}

// Module-level cache to persist data across tab switches (unmounts)
const overviewCache = {
  teams: [] as any[],
  teamMembers: {} as Record<string, any[]>,
  selectedTeam: "",
};

const OverviewTab: React.FC<OverviewTabProps> = ({
  currentEmployee,
  user,
  itemVariants,
}) => {
  const [teams, setTeams] = useState<any[]>(overviewCache.teams);
  const [selectedTeam, setSelectedTeam] = useState<string>(overviewCache.selectedTeam);
  const [teamMembers, setTeamMembers] = useState<any[]>(
    overviewCache.selectedTeam ? (overviewCache.teamMembers[overviewCache.selectedTeam] || []) : []
  );
  const [loading, setLoading] = useState(
    !overviewCache.selectedTeam || !overviewCache.teamMembers[overviewCache.selectedTeam]
  );

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/teams`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
          overviewCache.teams = data.teams || [];
          
          // Default to the user's team if available
          if (!overviewCache.selectedTeam) {
            if (user?.team_id) {
              setSelectedTeam(user.team_id.toString());
              overviewCache.selectedTeam = user.team_id.toString();
            } else if (data.teams && data.teams.length > 0) {
              setSelectedTeam(data.teams[0].id.toString());
              overviewCache.selectedTeam = data.teams[0].id.toString();
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      }
    };
    fetchTeams();
  }, [user]);

  // Fetch team members when selectedTeam changes
  useEffect(() => {
    const fetchTeamAttendance = async () => {
      if (!selectedTeam) return;
      
      overviewCache.selectedTeam = selectedTeam;
      
      // Only show loading spinner if we don't have cached data for this team
      if (!overviewCache.teamMembers[selectedTeam]) {
        setLoading(true);
      }
      
      try {
        const response = await fetch(`${API_URL}/api/employees/by-team/${selectedTeam}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data);
          overviewCache.teamMembers[selectedTeam] = data;
        }
      } catch (error) {
        console.error("Failed to fetch team attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAttendance();
    const interval = setInterval(fetchTeamAttendance, 60000);
    
    // Listen for custom event to instantly refresh
    const handleRefresh = () => fetchTeamAttendance();
    window.addEventListener('refreshTeamStatus', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshTeamStatus', handleRefresh);
    };
  }, [selectedTeam]);

  // Group members into columns
  const checkedIn = teamMembers.filter(m => m.status === "Checked In");
  const notCheckedIn = teamMembers.filter(m => m.status === "Checked Out" || m.status === "Not Checked In" || m.status === "Absent");
  const onLeave = teamMembers.filter(m => m.status === "Leave");

  const MemberCard = ({ member }: { member: any }) => (
    <div className="flex items-center gap-3 p-3 bg-white/80 hover:bg-white backdrop-blur-sm rounded-xl border border-white/50 shadow-sm transition-all hover:shadow-md">
      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
        {member.profile_image ? (
          <img
            src={`data:image/jpeg;base64,${member.profile_image}`}
            alt={member.first_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
            alt={member.first_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-[14px] font-semibold text-gray-900 truncate">
            {member.first_name} {member.last_name}
          </h4>
          {member.lunch_break && (
            <span title="On Lunch Break" className="flex items-center justify-center bg-orange-100 text-orange-600 rounded-full p-1 shadow-sm border border-orange-200">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </span>
          )}
          {member.tea_break && (
            <span title="On Tea Break" className="flex items-center justify-center bg-amber-100 text-amber-700 rounded-full p-1 shadow-sm border border-amber-200">
              <Coffee className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <p className="text-[12px] text-gray-500 truncate">{member.role}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      variants={itemVariants}
      className="max-w-7xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px] font-['Inter']">

        {/* Header with Team Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-900">Team Status Overview</h3>
            <p className="text-sm text-gray-500">Real-time attendance of team members</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="team-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Select Team:
            </label>
            <select
              id="team-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full sm:w-48 p-2.5"
            >
              {teams.length === 0 && <option value="">Loading teams...</option>}
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-base font-medium text-gray-900">No members found</h4>
            <p className="text-sm text-gray-500 mt-1">There are no employees associated with this team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

            {/* Not Checked In Column */}
            <div className="flex flex-col bg-slate-50/80 rounded-xl p-4 border border-slate-200 h-[calc(100vh-320px)] min-h-[350px] max-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h4 className="font-semibold text-slate-800">Not Checked In</h4>
                </div>
                <span className="text-xs font-medium bg-white text-slate-600 px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                  {notCheckedIn.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {notCheckedIn.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No members in this status</p>
                ) : (
                  notCheckedIn.map(member => <MemberCard key={member.employee_id} member={member} />)
                )}
              </div>
            </div>

            {/* Checked In Column */}
            <div className="flex flex-col bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 h-[calc(100vh-320px)] min-h-[350px] max-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h4 className="font-semibold text-emerald-800">Checked In</h4>
                </div>
                <span className="text-xs font-medium bg-white text-emerald-700 px-2.5 py-1 rounded-full shadow-sm border border-emerald-100">
                  {checkedIn.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {checkedIn.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No members checked in</p>
                ) : (
                  checkedIn.map(member => <MemberCard key={member.employee_id} member={member} />)
                )}
              </div>
            </div>

            {/* Leave Column */}
            <div className="flex flex-col bg-rose-50/80 rounded-xl p-4 border border-rose-200 h-[calc(100vh-320px)] min-h-[350px] max-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <h4 className="font-semibold text-rose-800">On Leave</h4>
                </div>
                <span className="text-xs font-medium bg-white text-rose-700 px-2.5 py-1 rounded-full shadow-sm border border-rose-100">
                  {onLeave.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {onLeave.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No members on leave</p>
                ) : (
                  onLeave.map(member => <MemberCard key={member.employee_id} member={member} />)
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OverviewTab;