import React from 'react';
import { BASE_URL } from '../data/layoutData';

interface WorkAnniversaryModalProps {
  anniversaryEmployees: any[];
  isMyAnniversary: boolean;
  currentEmployee: any;
  user: any;
  onClose: () => void;
  onSendWish: (emp: any, message: string) => void;
}

const WorkAnniversaryModal: React.FC<WorkAnniversaryModalProps> = ({
  anniversaryEmployees,
  isMyAnniversary,
  currentEmployee,
  user,
  onClose,
  onSendWish,
}) => {
  const [selectedEmpForWish, setSelectedEmpForWish] = React.useState<any | null>(null);
  const [wishMessage, setWishMessage] = React.useState<string>("");

  const presetMessages = [
    "Happy Work Anniversary! Thank you for your dedication and great contributions to our team! 🎉🎗️",
    "Wishing you a very Happy Work Anniversary! It is a pleasure working with you. ✨👏",
    "Congratulations on another successful year with S4Carlisle! Wishing you continued growth and success! 🚀🏆",
  ];

  if (isMyAnniversary) {
    const myEmpData = anniversaryEmployees.find((emp) => Number(emp.user_id) === Number(user?.id)) || currentEmployee;
    const imageId = myEmpData?.id || localStorage.getItem("employee_id");
    const yearsCompleted = myEmpData?.years_completed || 1;

    return (
      <div className="fixed inset-0 z-[9999] bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_45%,#94a3b8_100%)] overflow-y-auto overflow-x-hidden animate-bg">
        <style>{`
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.02); }
          }
          @keyframes photo-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          @keyframes gold-shine {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes sparkle-pulse {
            0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.5; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
          }
          @keyframes ribbon-fall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
          }
          .animate-float { animation: float-gentle 6s ease-in-out infinite; }
          .animate-photo { animation: photo-float 5s ease-in-out infinite; }
          .animate-shine { animation: gold-shine 6s linear infinite; }
          .animate-sparkle { animation: sparkle-pulse 2s ease-in-out infinite; }
        `}</style>
        <div className="relative w-full min-h-screen overflow-hidden">
          {/* Confetti & Ribbons Layer */}
          {Array.from({ length: 40 }).map((_, i) => {
            const left = (i * 2.5) + (Math.random() * 2);
            const delay = Math.random() * 8;
            const duration = 6 + Math.random() * 6;
            const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: -20,
                  left: `${left}%`,
                  width: 8,
                  height: 14,
                  backgroundColor: colors[i % colors.length],
                  borderRadius: "2px",
                  opacity: 0.8,
                  pointerEvents: "none",
                  zIndex: 2,
                  animation: `ribbon-fall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}

          <button
            onClick={onClose}
            className="absolute top-6 right-6 md:top-8 md:right-10 z-20 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-3xl font-bold text-gray-700 hover:text-indigo-600 hover:bg-neutral-50 hover:scale-110 transition-all duration-300 transform active:scale-95"
          >
            ✕
          </button>

          <div className="relative z-10 flex flex-col items-center justify-start px-6 md:px-16 pt-16 pb-12 min-h-screen w-full max-w-[1440px] mx-auto">
            <div className="flex flex-col items-center text-center w-full select-none mb-8">
              <div className="text-slate-800 text-xl md:text-2xl font-bold tracking-[6px] mb-2">
                HAPPY WORK ANNIVERSARY
              </div>
              <div className="text-indigo-900 text-5xl md:text-7xl font-extrabold leading-none drop-shadow-md">
                {yearsCompleted} {yearsCompleted === 1 ? "YEAR" : "YEARS"} COMPLETED
              </div>
              <div className="text-3xl md:text-5xl font-black mt-4 bg-[linear-gradient(120deg,#1e3a8a_20%,#3b82f6_40%,#ffffff_50%,#3b82f6_60%,#1e3a8a_80%)] bg-[length:200%_auto] bg-clip-text text-transparent drop-shadow-md animate-shine">
                {user?.full_name}
              </div>
              <div className="mt-4 text-slate-700 text-sm md:text-base font-semibold tracking-[2px]">
                THANK YOU FOR YOUR DEDICATION & EXCELLENCE
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start justify-between w-full gap-10 md:gap-16 mt-2">
              <div className="flex flex-col items-start justify-start w-full md:w-auto">
                <div className="w-80 md:w-96 animate-photo relative flex flex-col items-center mx-0 self-start">
                  <div className="absolute -top-4 -right-4 text-3xl animate-sparkle" style={{ animationDelay: "0.2s" }}>🌟</div>
                  <div className="absolute top-1/2 -left-8 text-4xl animate-sparkle" style={{ animationDelay: "1.2s" }}>✨</div>

                  <img
                    src={`${BASE_URL}/employees/image/${imageId}`}
                    alt="Work Anniversary"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                    }}
                    className="w-72 h-72 md:w-80 md:h-80 rounded-full object-cover border-6 border-white shadow-2xl -mb-12 relative z-20"
                  />
                  <div className="w-80 md:w-96 h-14 rounded-full shadow-lg bg-[linear-gradient(#ffffff,#f1f1f6)] z-10" />
                  <div className="w-80 md:w-96 h-28 -mt-5 rounded-b-xl bg-[linear-gradient(#f2f2f7,#e2e2ea)] z-10" />
                </div>
              </div>

              <div className="relative flex flex-col items-center md:items-start max-w-md mt-10 md:mt-0 w-full md:w-auto">
                <div className="inline-block px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm md:text-base font-bold tracking-wider mb-4">
                  🎗️ WORK ANNIVERSARY MILESTONE
                </div>
                <div className="text-slate-700 text-base md:text-lg leading-relaxed text-center md:text-left">
                  Congratulations on reaching another memorable milestone with S4Carlisle! 
                  Your hard work, commitment, and positive energy continue to inspire all of us. 
                  Wishing you many more successful years ahead!
                </div>
                
                <div className="mt-6 md:mt-8 text-slate-800 text-xs md:text-sm font-bold tracking-wide z-10 text-center md:text-right w-full">
                  — S4 CARLISLE PUBLISHING SERVICES
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-5 right-5 z-[9999] w-[440px] max-w-[92vw]">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-blue-600 px-6 py-5 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl">
            {selectedEmpForWish ? "✨ Customize Anniversary Wish" : "🎗️ Work Anniversaries Today"}
          </h2>
          <button
            onClick={onClose}
            className="text-white text-3xl leading-none hover:opacity-80 transition-opacity"
          >
            ✕
          </button>
        </div>

        {selectedEmpForWish ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <img
                src={`${BASE_URL}/employees/image/${selectedEmpForWish.id}`}
                alt={selectedEmpForWish.first_name}
                className="w-14 h-14 rounded-full object-cover border border-gray-200"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-base truncate">
                  Send Wishes to {selectedEmpForWish.first_name} {selectedEmpForWish.last_name}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {selectedEmpForWish.designation} &bull; {selectedEmpForWish.years_completed} {selectedEmpForWish.years_completed === 1 ? "Year" : "Years"} at S4Carlisle
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                Select a Wish
              </label>
              <div className="flex flex-col gap-2">
                {presetMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWishMessage(msg)}
                    className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-all ${
                      wishMessage === msg
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {wishMessage ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Selected Wish
                </label>
                <div
                  className="w-full text-sm p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-950 leading-relaxed"
                  style={{ userSelect: "text", cursor: "text" }}
                >
                  {wishMessage}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedEmpForWish(null);
                  setWishMessage("");
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  if (!wishMessage.trim()) return;
                  try {
                    await onSendWish(selectedEmpForWish, wishMessage);
                    setSelectedEmpForWish(null);
                    setWishMessage("");
                  } catch (error) {
                    console.error(error);
                  }
                }}
                disabled={!wishMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Send Wishes
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto p-5 space-y-4">
            {anniversaryEmployees.map((emp: any) => (
              <div
                key={emp.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/30 border border-indigo-100 hover:bg-indigo-50/60 transition-colors"
              >
                <img
                  src={`${BASE_URL}/employees/image/${emp.id}`}
                  alt={emp.first_name}
                  className="w-16 h-16 rounded-full object-cover border border-indigo-200 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-800 text-lg truncate">
                    {emp.first_name} {emp.last_name}
                  </h3>
                  <p className="text-sm text-neutral-500 truncate">{emp.designation}</p>
                  <p className="text-sm text-indigo-700 font-semibold mt-1">
                    🎗️ {emp.years_completed} {emp.years_completed === 1 ? "Year" : "Years"} Work Anniversary Today
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmpForWish(emp);
                    setWishMessage(presetMessages[0]);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  🎉 Wishes
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-neutral-500 py-3.5 border-t border-neutral-200 bg-neutral-50">
          — S4 Carlisle Publishing Services
        </div>
      </div>
    </div>
  );
};

export default WorkAnniversaryModal;
