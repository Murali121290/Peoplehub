import axios from "axios";
import { API_URL } from "../config/api";

const API = `${API_URL}/api/meeting-rooms`;

export const getRooms = () =>
  axios.get(`${API}/rooms`);

export const getBookings = () =>
  axios.get(`${API}/bookings`);

export const createBooking = (data: any) =>
  axios.post(`${API}/bookings`, data);

export const createRoom = (data: any) =>
  axios.post(`${API}/rooms`, data);

export const updateRoom = (id: number, data: any) =>
  axios.put(`${API}/rooms/${id}`, data);

export const deleteRoom = (id: number) =>
  axios.delete(`${API}/rooms/${id}`);

export const cancelBooking = (id: number) =>
  axios.put(
    `${API}/bookings/${id}/cancel`
  );

  export const getDashboardStats = () =>
  axios.get(
    `${API_URL}/api/meeting-rooms/dashboard-stats`
  );