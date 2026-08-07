import { io } from "socket.io-client";
import { BASE_API_URL } from "../config/api";

const SOCKET_URL = BASE_API_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});