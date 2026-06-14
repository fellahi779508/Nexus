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
export async function printBarcode(text: string) {
  try {
    const quantity = 9;
    // 1. Fetch the barcode image as a Blob
    const response = await api.get("/product-variant/print", {
      params: { text: text },
      responseType: "blob", // Crucial for handling binary data/images
    });

    const blobUrl = URL.createObjectURL(response.data);

    // 2. Open a clean, empty window
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Popup blocked! Please allow popups to print.");
      return;
    }

    // 3. Generate HTML containing multiple copies of the barcode image
    let barcodeImagesHtml = "";
    for (let i = 0; i < quantity; i++) {
      barcodeImagesHtml += `<img src="${blobUrl}" class="barcode-item" alt="barcode" />`;
    }

    // 4. Inject the layout, barcode images, and specialized thermal printer CSS
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            /* Reset margins for continuous roll/ticket sizing */
            html, body {
              margin: 0;
              padding: 0;
              background-color: #fff;
            }

            /* Stack items on top of each other in a centered column */
            .ticket-container {
              display: flex;
              flex-direction: column; /* Stacks them vertically */
              align-items: center;    /* Centers them horizontally */
              gap: 25px;              /* Spacing between barcodes on screen */
              padding: 10px;
              box-sizing: border-box;
              width: 100%;
            }

            /* Crisp scales for the barcode image */
            .barcode-item {
              display: block;
              max-width: 100%;
              height: auto;
              image-rendering: pixelated; /* Prevents blurriness on thermal heads */
            }

            /* CSS specifically applied when the print dialog opens */
            @media print {
              @page {
                margin: 0;       /* Removes browser headers/footers (date, URL) */
                size: auto;      /* Let the printer driver control the physical width */
              }
              body {
                -webkit-print-color-adjust: exact;
              }
              
              /* CRITICAL FOR THERMAL PRINTERS: 
                If you want 1 barcode per physical sticker tag, uncomment the line below:
              */
              /* .barcode-item { page-break-after: always; } */
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            ${barcodeImagesHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // 5. Trigger the print screen after images finish rendering
    printWindow.onload = () => {
      printWindow.print();
      // Clean up memory
      URL.revokeObjectURL(blobUrl);
    };
  } catch (error) {
    console.error("Failed to print barcodes:", error);
  }
}
