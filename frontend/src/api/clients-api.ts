"use client";
import api from "@/utils/api";
import { PostClient } from "@/utils/types";

export async function getAllClients(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(`/client?search=${search}&page=${page}&limit=${limit}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
export async function postClient(client: PostClient) {
  try {
    const response = await api.post("/client", client).then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.respons.data.mesage);
    return { response: error.respons.data.mesage, status: 0 };
  }
}
export async function updateClient(id: number, client: any) {
  console.log(client);

  try {
    const response = await api
      .put(`/client/${id}`, client)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response);

    return { error, status: 0 };
  }
}
export async function getClientById(id: number) {
  try {
    const response = await api.get(`/client/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}

export async function deleteClientById(id: number) {
  try {
    const response = await api.delete(`/client/${id}`).then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
export async function deleteCreditsofClient(id: number) {
  try {
    const response = await api
      .delete(`/credit/client/${id}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error) {
    return { error, status: 0 };
  }
}
