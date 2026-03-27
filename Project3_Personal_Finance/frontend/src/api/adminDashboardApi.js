import api from "./api";

export const getAdminSummary = () =>
  api.get("/admin/dashboard/summary");

export const getUsersByMonth = () =>
  api.get("/admin/dashboard/users-by-month");

export const getTransactionsByMonth = () =>
  api.get("/admin/dashboard/transactions-by-month");