"use client";
import api from "@/utils/api";

export async function getAllStocks(
  page: number,
  search?: string,
  status?: string,
  stockStatus?: string,
) {
  try {
    const response = await api
      .get(
        `/stock?page=${page}&limit=10${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}${stockStatus ? `&stockStatus=${stockStatus}` : ""}`,
      )
      .then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function addToStock(id: number, quantity: number, reason: string) {
  try {
    const response = await api
      .put(`/stock/add/${id}`, { quantity, reason })
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function removeFromStock(
  id: number,
  quantity: number,
  reason: string,
) {
  try {
    const response = await api
      .put(`/stock/remove/${id}`, { quantity, reason })
      .then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
