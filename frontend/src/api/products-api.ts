"use client";
import { PostProduct } from "@/utils/types";
import api from "@/utils/api";

export async function postProduct(object: PostProduct) {
  try {
    const response = await api.post("/product", object).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getProduct(id: number) {
  try {
    const response = await api.get(`/product/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getAllProducts(page: number, search: string) {
  try {
    const response = await api
      .get(`/product?page=${page}&limit=15&search=${search}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function updateProductApi(id: number, object: PostProduct) {
  try {
    const response = await api
      .put(`/product/${id}`, object)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function deleteProductById(id: number) {
  try {
    const response = await api.delete(`/product/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
