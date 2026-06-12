"use client";
import api from "@/utils/api";

export async function getTodaysProfits() {
  try {
    const response = await api
      .get(`/owner/todayProfit`)
      .then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getTodaysSales() {
  try {
    const response = await api.get(`/owner/todaySales`).then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getTodaysLosses() {
  try {
    const response = await api
      .get(`/owner/todayLosses`)
      .then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getTodaysCosts() {
  try {
    const response = await api.get(`/owner/todayCosts`).then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function getTodaysPurchases() {
  try {
    const response = await api
      .get(`/owner/todayPurchases`)
      .then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
export async function deleteDataBase() {
  try {
    const response = await api.delete(`/owner/db`).then((res) => res.data);
    console.log(response);
    return { response, status: 1 };
  } catch (error: any) {
    return { error: error.response.data.message, status: 0 };
  }
}
