import { io } from "socket.io-client";

export const socket = io(
  "http://10.1.8.103:5000"
);