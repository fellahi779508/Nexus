"use client";
import api from "@/utils/api";
import { PostVarinat } from "@/utils/types";
import { edgeServerAppPaths } from "next/dist/build/webpack/plugins/pages-manifest-plugin";

export async function postVariant(body: PostVarinat) {
  const now = new Date().toISOString();
  try {
    const response = await api
      .post("/product-variant", {
        ...body,
        createdAt: now,
        updatedAt: now,
      })
      .then((resp) => resp.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return {
      response: error.response.data.message[0],
      status: 0,
    };
  }
}
export async function getProductvariantsById(
  productId: number,
  page: number,
  search?: string,
) {
  try {
    const response = await api
      .get(
        `/product-variant/product/${productId}?search=${search}&page=${page}&limit=10`,
      )
      .then((resp) => resp.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function getVaraiantById(id: number) {
  try {
    const response = await api
      .get(`product-variant/${id}`)
      .then((res) => res.data);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function getVaraiantByBarcode(barcode: string) {
  try {
    const response = await api
      .get(`product-variant/barcode/${barcode}`)
      .then((res) => res.data);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function getNewbarCode() {
  try {
    const response = await api
      .get("/product-variant/barcode")
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function putVariant(id: number, body: PostVarinat) {
  try {
    const response = await api
      .put(`/product-variant/${id}`, body)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function deleteVariantById(id: number) {
  try {
    const response = await api
      .delete(`/product-variant/${id}`)
      .then((res) => res.data);
    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function getAllBatchesOfVariant(
  id: number,
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(`/batch/variant/${id}?search=${search}&page=${page}&limit=${limit}`)
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export default async function getAllSallableVariants(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(
        `/product-variant/sallable?page=${page}&limit=${limit}&search=${search}`,
      )
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}

export async function getAllSallableVariantsAll(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(
        `/product-variant/sallable/all?page=${page}&limit=${limit}&search=${search}`,
      )
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
export async function getAllPurchasableVariants(
  page: number,
  limit: number,
  search?: string,
) {
  try {
    const response = await api
      .get(
        `/product-variant/purchasable/all?page=${page}&limit=${limit}&search=${search}`,
      )
      .then((res) => res.data);
    console.log(response);

    return { response, status: 1 };
  } catch (error: any) {
    console.log(error.response.data.message);
    return { response: error.response.data.message, status: 0 };
  }
}
