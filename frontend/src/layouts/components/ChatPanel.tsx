import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ChatPanelProps {
  employees: any[];
  selectedUser: any;
  messages: any[];
  messageText: string;
  onSelectUser: (emp: any) => void;
  onMessageChange: (val: string) => void;
  onSend: () => void;
  onClose: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  employees = [],
  selectedUser,
  messages = [],
  messageText,
  onSelectUser,
  onMessageChange,
  onSend,
  onClose,
}) => {
  const myId = Number(
    localStorage.getItem("employee_id")
  );

  return (
    <div className="fixed bottom-6 right-6 w-[460px] h-[640px] bg-white rounded-[20px] shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200">

      {/* Header */}
      <div className="flex items-center border-b border-gray-100">
        <div className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium border-b-2 border-blue-500 text-blue-700 bg-blue-50">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Messages
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 mr-2 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Employee List */}
        <div className="w-[170px] border-r border-gray-200 overflow-y-auto">

          {employees.length > 0 ? (
            employees.map((emp: any, index: number) => (
              <div
                key={`emp-${index}`}
                onClick={() => {
  console.log(emp);
  onSelectUser(emp);
}}
                className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                  selectedUser?.user_id === emp.user_id
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">

                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold">
                    {emp.first_name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {emp.first_name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {emp.designation}
                    </p>
                  </div>

                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-400">
              No Employees
            </div>
          )}

        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">

          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold">
                  {selectedUser.first_name?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                  <p className="font-semibold">
                    {selectedUser.first_name}{" "}
                    {selectedUser.last_name}
                  </p>

                  <p className="text-xs text-green-500">
                    Online
                  </p>
                </div>

              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">

                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMine =
                      Number(msg.employee_id) === myId;

                    return (
                      <div
                        key={msg.id || `${msg.employee_id}-${msg.created_at}`}
                        className={`mb-3 flex ${
                          isMine
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isMine
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-black"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}

              </div>

              {/* Input */}
              <div className="border-t p-3">

                <div className="flex gap-2">

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) =>
                      onMessageChange(
                        e.target.value
                      )
                    }
                    placeholder="Type Message..."
                    className="flex-1 border rounded-lg px-4 py-2 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSend();
                      }
                    }}
                  />

                  <button
                    onClick={onSend}
                    className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
                  >
                    Send
                  </button>

                </div>

              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a user to start chatting
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ChatPanel;