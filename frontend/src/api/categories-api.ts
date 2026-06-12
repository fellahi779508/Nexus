"use client";
import api from "@/utils/api";
import { PostCategory } from "@/utils/types";

export async function fetchCategories(
  page: number,
  limit: number,
  search: string,
) {
  try {
    const response = await api
      .get(`/category?search=${search}&page=${page}&limit=${limit}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}

export async function createCategory(category: PostCategory) {
  try {
    const response = await api
      .post(`/category`, category)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
export async function getCategoryById(id: number) {
  try {
    const response = await api.get(`/category/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
export async function updateCategory(id: number, category: PostCategory) {
  try {
    const response = await api
      .put(`/category/${id}`, category)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
export async function deleteCategoryById(id: number) {
  try {
    const response = await api.delete(`/category/${id}`);
    return { response, status: 1 };
  } catch (error: any) {
    return { respons: error.response.data.message, status: 0 };
  }
}
