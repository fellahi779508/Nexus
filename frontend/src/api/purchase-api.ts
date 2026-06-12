"use client";
import api from "@/utils/api";
import { PostPurchase } from "@/utils/types";

export async function createPurchase(body: PostPurchase) {
  try {
    const response = await api
      .post(`/stock-payment`, body)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data);

    return { error, status: 0 };
  }
}
export async function updatePurchaseById(id: number, body: PostPurchase) {
  try {
    const response = await api
      .put(`/stock-payment/${id}`, body)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data);

    return { error, status: 0 };
  }
}
export async function getTodaysPurchases() {
  try {
    const response = await api
      .get(`/stock-payment/todays`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function getAllPurchases(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(`/stock-payment?page=${page}&limit=${limit}&search=${search}`)
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function getPurchaseById(id: number) {
  try {
    const response = await api
      .get(`/stock-payment/${id}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function deletePurchaseById(id: number) {
  try {
    const response = await api
      .delete(`/stock-payment/${id}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error, status: 0 };
  }
}
export async function printPurchase(id: number, paperType: string = "A4") {
  try {
    const response = await api.get(
      `/stock-payment/print/${id}?paper=${paperType}`,
      {
        responseType: "blob",
      },
    );
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
