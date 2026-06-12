"use client";
import api from "@/utils/api";
import { PostSale } from "@/utils/types";

export async function getAllSales(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(`/sale?page=${page}&limit=${limit}&search=${search}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response);
    return { error, status: 0 };
  }
}
export async function createSale(data: PostSale) {
  try {
    const response = await api.post(`/sale`, data).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function getTodaysSales() {
  try {
    const response = await api.get(`/sale/todays`).then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function getTodaysDetailedSales() {
  try {
    const response = await api
      .get(`/sale/todays/detailed`)
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export default async function updateSaleByid(id: number, Sale: any) {
  try {
    const response = await api.put(`/sale/${id}`, Sale).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function getSaleById(id: number) {
  try {
    const response = await api.get(`/sale/${id}`).then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function deleteSaleById(id: number) {
  try {
    const response = await api.delete(`/sale/${id}`).then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function printSale(id: number, paperType: string) {
  try {
    const response = await api.get(`/sale/print/${id}?paper=${paperType}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
export async function clearAllSales() {
  try {
    const response = await api.delete(`/sale/clear`).then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
