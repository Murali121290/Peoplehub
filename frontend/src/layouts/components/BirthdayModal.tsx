import React from 'react';
import { BASE_URL } from '../data/layoutData';

interface BirthdayModalProps {
  birthdayEmployees: any[];
  isMyBirthday: boolean;
  currentEmployee: any;
  user: any;
  onClose: () => void;
  onSendWish: (emp: any, message: string) => void;
}

/* ---------------------------------------------------------------------- */
/* Balloon sub-component (used only in the isMyBirthday celebration view) */
/* ---------------------------------------------------------------------- */

interface BalloonProps {
  top: number | string;
  left: number | string;
  width: number;
  height: number;
  base: string;
  highlight: string;
  shadow: string;
  stringLength: number;
  stringLeft: number;
  tilt?: number;
}

const Balloon: React.FC<BalloonProps> = ({
  top,
  left,
  width,
  height,
  base,
  highlight,
  shadow,
  stringLength,
  stringLeft,
  tilt = 0,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width,
        height: height + stringLength,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <div
        style={{
          position: "relative",
          width,
          height,
          borderRadius: "50% 50% 50% 50% / 58% 58% 42% 42%",
          background: `radial-gradient(circle at 30% 24%, ${highlight} 0%, ${base} 55%, ${shadow} 100%)`,
          boxShadow: "3px 8px 18px rgba(15,15,35,0.28)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "16%",
            left: "22%",
            width: "26%",
            height: "18%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            filter: "blur(1px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 8,
            height: 8,
            background: shadow,
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: height,
          left: stringLeft,
          width: 1,
          height: stringLength,
          background: "rgba(50,50,80,0.35)",
        }}
      />
    </div>
  );
};

const BirthdayModal: React.FC<BirthdayModalProps> = ({
  birthdayEmployees,
  isMyBirthday,
  currentEmployee,
  user,
  onClose,
  onSendWish,
}) => {
  const [selectedEmpForWish, setSelectedEmpForWish] = React.useState<any | null>(null);
  const [wishMessage, setWishMessage] = React.useState<string>("");

  const presetMessages = [
    "Happy Birthday! Wishing you a wonderful year ahead. 🎂🎉",
    "Wishing you a very Happy Birthday! Hope you have a great day filled with joy. ✨",
    "Happy Birthday! May your day be as wonderful as you are. Have a blast! 🥳",
  ];

  if (isMyBirthday) {
    const myEmployeeData = birthdayEmployees.find((emp) => Number(emp.user_id) === Number(user?.id)) || currentEmployee;
    const imageId = myEmployeeData?.id || localStorage.getItem("employee_id");

    return (
      <div className="fixed inset-0 z-[9999] bg-[linear-gradient(135deg,#d3d6ea_0%,#b8bcdb_45%,#9ea5d0_100%)] overflow-y-auto">
        <div className="relative w-full min-h-screen overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 md:top-8 md:right-10 z-20 w-14 h-14 rounded-full bg-white shadow-xl hover:bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-700"
          >
            ✕
          </button>

          {/* Big background circle */}
          <div className="absolute -top-[120px] -left-[180px] w-[520px] h-[520px] rounded-full border border-white/25 bg-[radial-gradient(circle_at_35%_30%,rgba(178,181,214,0.9),rgba(150,153,196,0.85)_55%,rgba(130,133,182,0.75)_100%)]" />

          {/* Floating dots */}
          <div className="absolute top-[70px] left-[280px] w-[30px] h-[30px] rounded-full shadow-md bg-pink-300 hidden md:block" />
          <div className="absolute top-[140px] left-[330px] w-[46px] h-[46px] rounded-full shadow-md bg-indigo-300 hidden md:block" />
          <div className="absolute top-[220px] left-[250px] w-[20px] h-[20px] rounded-full shadow-md bg-purple-300 hidden md:block" />

          {/* Confetti sticks */}
          <div className="absolute top-[24px] left-[190px] w-[3px] h-7 rounded-sm rotate-[35deg] bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block" />
          <div className="absolute top-[12px] left-[220px] w-[3px] h-5 rounded-sm rotate-[35deg] bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block" />
          <div className="absolute top-[55px] left-[420px] w-[3px] h-7 rounded-sm rotate-[35deg] bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block" />

          {/* Main content wrapper */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 px-6 md:px-16 pt-28 pb-16 min-h-screen">
            {/* Left: photo + name */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md">
              <div className="text-pink-400 text-xl md:text-2xl font-bold tracking-[6px] mb-2">
                HAPPY
              </div>
              <div className="text-white text-5xl md:text-7xl font-extrabold leading-none drop-shadow-md">
                BIRTHDAY
              </div>
              <div className="text-white text-3xl md:text-4xl font-bold mt-4">
                {user?.full_name}
              </div>
              <div className="mt-4 text-purple-50 text-sm md:text-base font-semibold tracking-[2px]">
                YOU ARE THE MOST AMAZING
              </div>

              {/* Photo */}
              <div className="mt-10 w-48">
                <img
                  src={`${BASE_URL}/employees/image/${imageId}`}
                  alt="Birthday"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                  }}
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl mx-auto md:mx-0 -mb-8 relative z-10"
                />
                <div className="w-48 h-9 rounded-full shadow-sm bg-[linear-gradient(#ffffff,#f1f1f6)]" />
                <div className="w-48 h-20 -mt-3 rounded-b-lg bg-[linear-gradient(#f2f2f7,#e2e2ea)]" />
                <div className="w-48 h-6 mt-1 rounded-full opacity-50 blur-[1px] bg-[linear-gradient(rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
              </div>
            </div>

            {/* Right: balloons + message */}
            <div className="relative flex flex-col items-center md:items-start max-w-sm">
              {/* Balloons cluster */}
              <div className="relative w-full h-56 mb-4 hidden md:block">
                <Balloon top={10} left={40} width={62} height={78} base="#cfd6e6" highlight="#eef1f7" shadow="#9aa0b8" stringLength={60} stringLeft={30} />
                <Balloon top={-10} left={120} width={54} height={70} base="#c9cfe0" highlight="#e7eaf3" shadow="#9297ae" stringLength={90} stringLeft={26} />
                <Balloon top={30} left={190} width={56} height={72} base="#3b3f66" highlight="#6a6f9c" shadow="#24273f" stringLength={70} stringLeft={27} />
                <Balloon top={-30} left={230} width={40} height={54} base="#5b6394" highlight="#8890c2" shadow="#3a3f60" stringLength={110} stringLeft={19} />
              </div>

              <div className="inline-block px-6 py-2.5 rounded-full bg-slate-800 text-white text-sm md:text-base font-bold tracking-wider">
                🎂 HAPPY BIRTHDAY
              </div>
              <div className="mt-6 text-slate-700 text-base md:text-lg leading-relaxed text-center md:text-left">
                We hope you always stay happy and all your dreams come true.
                Wishing you success, prosperity, good health and happiness
                throughout the year.
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="absolute bottom-4 right-6 md:right-10 text-slate-800 text-xs md:text-sm font-bold tracking-wide z-10">
            — S4 CARLISLE PUBLISHING SERVICES
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-5 right-5 z-[9999] w-[440px] max-w-[92vw]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 px-6 py-5 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl">
            {selectedEmpForWish ? "✨ Customize Wishes" : "🎉 Today's Birthdays"}
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
                  {selectedEmpForWish.designation} &bull; {selectedEmpForWish.department}
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Read-only selectable text block showing the chosen wish */}
            {wishMessage ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Selected Wish
                </label>
                <div
                  className="w-full text-sm p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 leading-relaxed"
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
                    onClose();
                  } catch (error) {
                    console.error(error);
                  }
                }}
                disabled={!wishMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Send Wishes
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto p-5 space-y-4">
            {birthdayEmployees.map((emp: any) => (
              <div
                key={emp.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <img
                  src={`${BASE_URL}/employees/image/${emp.id}`}
                  alt={emp.first_name}
                  className="w-16 h-16 rounded-full object-cover border border-gray-300 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg truncate">
                    {emp.first_name} {emp.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{emp.designation}</p>
                  <p className="text-sm text-gray-700 font-semibold mt-1">
                    🎂 Birthday Today
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmpForWish(emp);
                    setWishMessage(presetMessages[0]);
                  }}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  🎉 Wishes
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-gray-500 py-3.5 border-t border-gray-200 bg-gray-50">
          — S4 Carlisle Publishing Services
        </div>
      </div>
    </div>
  );
};

export default BirthdayModal;