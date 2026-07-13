import { API_URL } from "../config/api";
import { io } from "socket.io-client";

export const socket = io(API_URL, {
  autoConnect: false,
  transports: ["websocket"],
});