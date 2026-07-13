import { API_URL } from "../config/api";
import { io } from "socket.io-client";
import { API_URL } from "../config/api";

<<<<<<< HEAD
export const socket = io(API_URL, {
=======
export const socket = io(API_URL || undefined, {
>>>>>>> 881eff2d6d04a138ab2d8951a9dda89c8aee0db9
  autoConnect: false,
  transports: ["websocket"],
});