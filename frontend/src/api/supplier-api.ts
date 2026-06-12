"use client";
import api from "@/utils/api";
import { PostSupplier } from "@/utils/types";

export async function getAllSuppliers(
  page: number,
  limit?: number,
  search?: string,
) {
  try {
    const response = await api
      .get(`/supplier?page=${page}&limit=${limit || 10}&search=${search}`)
      .then((res) => res.data);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message[0], status: 0 };
  }
}
export async function GetSupplierById(id: number) {
  try {
    const response = await api.get(`/supplier/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message[0], status: 0 };
  }
}
export async function createSupplier(supplier: PostSupplier) {
  try {
    const response = await api
      .post(`/supplier`, {
        ...supplier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message[0], status: 0 };
  }
}
export async function updateSupplier(id: number, supplier: any) {
  try {
    const response = await api
      .put(`/supplier/${id}`, {
        ...supplier,
        updatedAt: new Date().toISOString(),
      })
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message[0], status: 0 };
  }
}
export async function deleteSupplier(id: number) {
  try {
    const response = await api
      .delete(`/supplier/${id}`)
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message[0], status: 0 };
  }
}
export async function deleteCreditsofSupplier(id: number) {
  try {
    const response = await api
      .delete(`/credit/supplier/${id}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
