import { io } from "socket.io-client";

export const socket = io("http://10.1.6.178:5001", {
  autoConnect: false,
  transports: ["websocket"],
});