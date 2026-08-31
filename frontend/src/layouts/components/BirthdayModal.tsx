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
  animation?: string;
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
  animation,
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
        animation: animation,
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
      <div className="fixed inset-0 z-[9999] bg-[linear-gradient(135deg,#d3d6ea_0%,#b8bcdb_45%,#9ea5d0_100%)] overflow-y-auto overflow-x-hidden animate-bg">
        <style>{`
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.02); }
          }
          @keyframes bg-shift {
            0%, 100% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(30deg); }
          }
          @keyframes photo-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          @keyframes stick-spin {
            0%, 100% { transform: rotate(35deg) scale(1); }
            50% { transform: rotate(50deg) scale(1.15); }
          }
          @keyframes stick-spin-reverse {
            0%, 100% { transform: rotate(-35deg) scale(1); }
            50% { transform: rotate(-50deg) scale(1.15); }
          }
          @keyframes confetti-fall {
            0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 1; }
            50% { transform: translateY(50vh) rotate(180deg) translateX(15px); opacity: 0.9; }
            100% { transform: translateY(105vh) rotate(360deg) translateX(-15px); opacity: 0; }
          }
          @keyframes balloon-sway-1 {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            50% { transform: translateY(-25px) translateX(12px) rotate(6deg); }
          }
          @keyframes balloon-sway-2 {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            50% { transform: translateY(-30px) translateX(-18px) rotate(-8deg); }
          }
          @keyframes balloon-sway-3 {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            50% { transform: translateY(-20px) translateX(15px) rotate(5deg); }
          }
          @keyframes balloon-sway-4 {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            50% { transform: translateY(-35px) translateX(-10px) rotate(-7deg); }
          }
          @keyframes gold-shine {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes sparkle-pulse {
            0%, 100% { transform: scale(0.7) rotate(0deg); opacity: 0.5; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
          }
          .animate-float {
            animation: float-gentle 6s ease-in-out infinite;
          }
          .animate-photo {
            animation: photo-float 5s ease-in-out infinite;
          }
          .animate-stick {
            animation: stick-spin 4s ease-in-out infinite;
          }
          .animate-stick-rev {
            animation: stick-spin-reverse 4.5s ease-in-out infinite;
          }
          .animate-shine {
            animation: gold-shine 6s linear infinite;
          }
          .animate-sparkle {
            animation: sparkle-pulse 2s ease-in-out infinite;
          }
          .animate-bg {
            animation: bg-shift 12s ease-in-out infinite;
          }
          @keyframes emoji-rain {
            0% { transform: translateY(-40px) rotate(0deg); opacity: 0; }
            8% { opacity: 0.85; }
            50% { transform: translateY(50vh) rotate(180deg); opacity: 0.75; }
            90% { opacity: 0.5; }
            100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
          }
        `}</style>
        <div className="relative w-full min-h-screen overflow-hidden">
          {/* Confetti Rain Layer */}
          {Array.from({ length: 45 }).map((_, i) => {
            const left = (i * 2.3) + (Math.random() * 2); // Spread across screen width
            const delay = Math.random() * 8;
            const duration = 5 + Math.random() * 6;
            const size = 6 + Math.random() * 8;
            const colors = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#a3e635"];
            const color = colors[i % colors.length];
            const shapes = ["50%", "0%", "2px"]; // circles, squares, rounded confetti
            const borderRadius = shapes[i % shapes.length];

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: -20,
                  left: `${left}%`,
                  width: size,
                  height: size,
                  backgroundColor: color,
                  borderRadius: borderRadius,
                  opacity: 0.8,
                  pointerEvents: "none",
                  zIndex: 2,
                  animation: `confetti-fall ${duration}s linear infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}

          {/* 🎉 Emoji Rain Layer — birthday emojis floating down */}
          {(() => {
            const emojiPool = ["🎂", "🎁", "🎈", "🎊", "🥳", "🎉", "🧁", "🍰", "🪅", "💐", "⭐", "🌟"];
            return Array.from({ length: 18 }).map((_, i) => {
              const leftPos = 4 + (i * 5.2) + (Math.random() * 3);
              const emojiDelay = 1 + Math.random() * 10;
              const emojiDuration = 8 + Math.random() * 7;
              const emojiSize = 18 + Math.random() * 18;
              const emoji = emojiPool[i % emojiPool.length];
              return (
                <div
                  key={`emoji-${i}`}
                  style={{
                    position: "absolute",
                    top: -40,
                    left: `${leftPos}%`,
                    fontSize: emojiSize,
                    pointerEvents: "none",
                    zIndex: 3,
                    opacity: 0,
                    animation: `emoji-rain ${emojiDuration}s linear infinite`,
                    animationDelay: `${emojiDelay}s`,
                  }}
                >
                  {emoji}
                </div>
              );
            });
          })()}

          {/* Close button with premium hover effect */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 md:top-8 md:right-10 z-20 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-3xl font-bold text-gray-700 hover:text-rose-500 hover:bg-neutral-50 hover:scale-110 hover:rotate-90 transition-all duration-300 transform active:scale-95"
          >
            ✕
          </button>

          {/* Big background circle */}
          <div className="absolute -top-[120px] -left-[180px] w-[520px] h-[520px] rounded-full border border-white/25 bg-[radial-gradient(circle_at_35%_30%,rgba(178,181,214,0.9),rgba(150,153,196,0.85)_55%,rgba(130,133,182,0.75)_100%)] animate-float" />

          {/* Floating dots */}
          <div className="absolute top-[70px] left-[280px] w-[30px] h-[30px] rounded-full shadow-md bg-pink-300 hidden md:block animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute top-[140px] left-[330px] w-[46px] h-[46px] rounded-full shadow-md bg-indigo-300 hidden md:block animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-[220px] left-[250px] w-[20px] h-[20px] rounded-full shadow-md bg-purple-300 hidden md:block animate-float" style={{ animationDelay: "0.5s" }} />

          {/* Confetti sticks */}
          <div className="absolute top-[24px] left-[190px] w-[3px] h-7 rounded-sm bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block animate-stick" />
          <div className="absolute top-[12px] left-[220px] w-[3px] h-5 rounded-sm bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block animate-stick-rev" style={{ animationDelay: "0.8s" }} />
          <div className="absolute top-[55px] left-[420px] w-[3px] h-7 rounded-sm bg-[linear-gradient(#f4a37b,#e8895f)] hidden md:block animate-stick" style={{ animationDelay: "1.5s" }} />

          {/* Main content wrapper */}
          <div className="relative z-10 flex flex-col items-center justify-start px-6 md:px-16 pt-16 pb-12 min-h-screen w-full max-w-[1440px] mx-auto">
            {/* 1. Centered Greeting Text Block (Spans full width, centered on page) */}
            <div className="flex flex-col items-center text-center w-full select-none mb-8">
              <div className="text-white text-xl md:text-2xl font-bold tracking-[6px] mb-2">
                HAPPY
              </div>
              <div className="text-white text-5xl md:text-7xl font-extrabold leading-none drop-shadow-md">
                BIRTHDAY
              </div>
              <div className="text-3xl md:text-5xl font-black mt-4 bg-[linear-gradient(120deg,#ffe066_20%,#f5af19_40%,#ffffff_50%,#f5af19_60%,#ffe066_80%)] bg-[length:200%_auto] bg-clip-text text-transparent drop-shadow-md animate-shine">
                {user?.full_name}
              </div>
              <div className="mt-4 text-purple-50 text-sm md:text-base font-semibold tracking-[2px]">
                YOU ARE THE MOST AMAZING
              </div>
            </div>

            {/* 2. Sub-wrapper layout: Photo stack on Left, Balloons + Card on Right */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between w-full gap-10 md:gap-16 mt-2">
              {/* Left Column: photo stack */}
              <div className="flex flex-col items-start justify-start w-full md:w-auto">
                {/* Photo stack with floating animation and sparkling stars - BIG SIZE */}
                <div className="w-80 md:w-96 animate-photo relative flex flex-col items-center mx-0 self-start">
                  {/* Magical Sparkles */}
                  <div className="absolute -top-4 -right-4 text-3xl animate-sparkle" style={{ animationDelay: "0.2s" }}>✨</div>
                  <div className="absolute top-1/2 -left-8 text-4xl animate-sparkle" style={{ animationDelay: "1.2s", animationDuration: "3s" }}>✨</div>
                  <div className="absolute -bottom-2 right-16 text-2xl animate-sparkle" style={{ animationDelay: "0.7s", animationDuration: "2.5s" }}>✨</div>

                  <img
                    src={`${BASE_URL}/employees/image/${imageId}`}
                    alt="Birthday"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                    }}
                    className="w-72 h-72 md:w-80 md:h-80 rounded-full object-cover border-6 border-white shadow-2xl -mb-12 relative z-20"
                  />
                  <div className="w-80 md:w-96 h-14 rounded-full shadow-lg bg-[linear-gradient(#ffffff,#f1f1f6)] z-10" />
                  <div className="w-80 md:w-96 h-28 -mt-5 rounded-b-xl bg-[linear-gradient(#f2f2f7,#e2e2ea)] z-10" />
                  <div className="w-80 md:w-96 h-10 mt-1 rounded-full opacity-50 blur-[2px] bg-[linear-gradient(rgba(255,255,255,0.35),rgba(255,255,255,0))]" />
                </div>
              </div>

              {/* Right Column: balloons + message */}
              <div className="relative flex flex-col items-center md:items-start max-w-sm mt-10 md:mt-0 w-full md:w-auto">
                {/* Balloons cluster with float/sway animations */}
                <div className="relative w-full h-56 mb-4 hidden md:block">
                  <Balloon top={10} left={40} width={62} height={78} base="#f97316" highlight="#fdba74" shadow="#c2410c" stringLength={60} stringLeft={30} animation="balloon-sway-1 7s ease-in-out infinite" />
                  <Balloon top={-10} left={120} width={54} height={70} base="#0ea5e9" highlight="#7dd3fc" shadow="#0369a1" stringLength={90} stringLeft={26} animation="balloon-sway-2 8s ease-in-out infinite" />
                  <Balloon top={30} left={190} width={56} height={72} base="#f97316" highlight="#fdba74" shadow="#c2410c" stringLength={70} stringLeft={27} animation="balloon-sway-3 6.5s ease-in-out infinite" />
                  <Balloon top={-30} left={230} width={40} height={54} base="#0ea5e9" highlight="#7dd3fc" shadow="#0369a1" stringLength={110} stringLeft={19} animation="balloon-sway-4 7.5s ease-in-out infinite" />
                </div>

                <div className="inline-block px-6 py-2.5 rounded-full bg-slate-800 text-white text-sm md:text-base font-bold tracking-wider">
                  🎂 HAPPY BIRTHDAY
                </div>
                <div className="mt-6 text-slate-700 text-base md:text-lg leading-relaxed text-center md:text-left">
                  We hope you always stay happy and all your dreams come true.
                  Wishing you success, prosperity, good health and happiness
                  throughout the year.
                </div>
                
                {/* Signature */}
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
        <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-5 flex justify-between items-center">
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
                    className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-all ${wishMessage === msg
                      ? "border-primary-500 bg-primary-50 text-primary-800 font-semibold"
                      : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
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
                  className="w-full text-sm p-3 rounded-lg border border-primary-200 bg-primary-50/50 text-primary-900 leading-relaxed"
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
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
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
                className="flex items-center gap-4 p-4 rounded-xl bg-primary-50/20 border border-primary-100/50 hover:bg-primary-50/40 transition-colors"
              >
                <img
                  src={`${BASE_URL}/employees/image/${emp.id}`}
                  alt={emp.first_name}
                  className="w-16 h-16 rounded-full object-cover border border-primary-200 shadow-sm"
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
                  <p className="text-sm text-primary-700 font-semibold mt-1">
                    🎂 Birthday Today
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmpForWish(emp);
                    setWishMessage(presetMessages[0]);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
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

export default BirthdayModal;