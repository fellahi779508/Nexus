"use client";
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import styles from "../sale.module.css";
import { useCallback, useEffect, useState } from "react";
import { Batch, Cart, Meta, Variant } from "@/utils/types";
import getAllSallableVariants, {
  getAllSallableVariantsAll,
  getVaraiantByBarcode,
} from "@/api/variant-api";
import PrintModal from "@/components/sale/printModal";
import CreditModal from "@/components/sale/creditModal";
import updateSaleByid, { createSale, printSale } from "@/api/sale-api";
import { toast, ToastContainer } from "react-toastify";
import Link from "next/link";
import { useTranslations } from "next-intl";
import RemiseModal from "@/components/sale/remiseModal";
import HistoryModal from "@/components/sale/historyModal";
import { selectStyles } from "@/components/products/selectStyles";
import Select from "react-select";
import TimbreModal from "@/components/sale/timbreModal";

export default function DetailedSale() {
  const t = useTranslations("sale");

  // ── soldItem now matches Sale's type exactly ──────────────────────────────
  type soldItem = {
    id?: number;
    batchId: number;
    quantity: number;
    total: number;
    maxStock: number; // ← added
    name: string;
    barcode: string;
    unit: string; // ← added
    qtePerUnit: number; // ← added
    sellingPriceTTC: number;
  };

  type transactionOptions = {
    print: boolean;
    credit: boolean;
    discount: boolean;
    history: boolean;
    timbre: boolean;
  };

  const [variants, stVariants] = useState<Variant[] | null>(null);
  const [openPrintModal, setOpenPrintModal] = useState(false);
  const [openCreditModal, setOpenCreditModal] = useState(false);
  const [openRemiseModal, setOpenRemiseModal] = useState(false);
  const [paperType, setPaperType] = useState<"A4" | "Ticket" | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCreditActivated, setIsCreditActivated] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [remise, setRemise] = useState(0);
  const [remiseAmount, setRemiseAmount] = useState(0);
  const [isRemiseActivated, setIsRemiseActivated] = useState(false);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [paymentMethod, setPaymentMethode] = useState<string | null>(null);
  const [openTimbreModal, setOpenTimbreModal] = useState(false);
  const [timbre, setTimbre] = useState(0);
  const [paymentMethodSelectOptions, setPaymentMethodSelectOption] = useState<
    {
      label: string;
      value: string;
    }[]
  >([
    {
      label: t("payment.cash"),
      value: "cash",
    },
    {
      label: t("payment.card"),
      value: "card",
    },
    {
      label: t("payment.bank"),
      value: "bank",
    },
    {
      label: t("payment.ccp"),
      value: "ccp",
    },
  ]);
  const [selectedSoldItem, setSelectedSoldItem] = useState<soldItem | null>(
    null,
  );
  const [selectedQteType, setSelecetedQteType] = useState<string | null>(null); // ← added
  const [selectedUnitType, setSelectedUnitType] = useState("piece"); // ← added
  const [cart, setCart] = useState<Cart>({ total: 0, soldItems: [] });
  const [meta, setMeta] = useState<Meta>({
    page: 1,
    pages: 1,
    limit: 10,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [transaction_options, setTransaction_options] =
    useState<transactionOptions>({
      print: false,
      credit: false,
      discount: false,
      timbre: false,
      history: false,
    });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [numPad_option, setNumPad_option] = useState<
    "Quantity" | "Price" | "QteUnit"
  >("Quantity"); // ← QteUnit added
  const [numPad_value, setNumPad_value] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
  }, [search]);

  const fetchVariants = useCallback(async () => {
    const res = await getAllSallableVariantsAll(page, 8, debouncedSearch);
    stVariants(res.response.data);
    setMeta(res.response.meta);
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchVariants();
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (isHistoryLoaded) {
      setSelectedSoldItem(null);
    }
  }, [isHistoryLoaded]);

  // ── addToCart — now sets maxStock, unit, qtePerUnit ──────────────────────
  function addToCart(item: Variant, batch: Batch) {
    const existingItem = cart.soldItems.find((i) => i.batchId === batch.id);
    if (existingItem) {
      setCart({
        ...cart,
        soldItems: cart.soldItems.map((i) =>
          i.batchId === batch.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: i.total + (item.promotionPrice ?? item.sellingPriceTTC),
              }
            : i,
        ),
      });
    } else {
      setCart({
        ...cart,
        soldItems: [
          ...cart.soldItems,
          {
            batchId: batch.id,
            quantity: 1,
            total: item.promotionPrice ?? item.sellingPriceTTC,
            name: `${item.product.name} - ${item.name}`,
            barcode: item.barcode,
            sellingPriceTTC: item.promotionPrice ?? item.sellingPriceTTC,
            maxStock:
              item.batches.find((b) => b.id === batch.id)?.stock.quantity || 0, // ← added
            unit: "piece", // ← added
            qtePerUnit: 1, // ← added
          },
        ],
      });
    }
  }

  function DeleteFromCart(item: soldItem) {
    setCart({
      ...cart,
      soldItems: cart.soldItems.filter((i) => i.batchId !== item.batchId),
    });
  }

  useEffect(() => {
    const total = cart.soldItems.reduce((acc, item) => acc + item.total, 0);
    setCart({ ...cart, total });
  }, [cart.soldItems]);

  useEffect(() => {
    if (isRemiseActivated && cart.total - remise <= 0) {
      alert(t("remiseAlert"));
      setRemise(0);
      setRemiseAmount(cart.total);
      return;
    }
    const r = cart.total - remise;
    setRemiseAmount(r);
  }, [cart.total, remise]);

  useEffect(() => {
    setOpenPrintModal(transaction_options.print);
  }, [transaction_options.print]);

  // ── modifyQte — adapted for DetailedSale (searches all batches) ──────────
  function modifyQte(item: soldItem, type: string) {
    // Find the batch across all variants' batch arrays
    const verify = variants?.find((v) =>
      v.batches.find((b) => b.id === item.batchId),
    );
    const maxStock =
      verify?.batches.find((b) => b.id === item.batchId)?.stock?.quantity ||
      item.maxStock ||
      0;
    if (maxStock <= 0) return;

    const currentCartItem = cart.soldItems.find(
      (i) => i.batchId === item.batchId,
    );
    if (!currentCartItem) return;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    if (type === "add") {
      newQuantity = newQuantity + 1;
    } else if (type === "remove") {
      newQuantity = newQuantity - 1;
      if (newQuantity < 1) newQuantity = 1;
    }

    if (newQuantity * newQtePerUnit > maxStock) {
      newQtePerUnit = Math.floor(maxStock / newQuantity);
      if (newQtePerUnit < 1) {
        newQtePerUnit = 1;
        newQuantity = maxStock;
      }
    }

    const newSoldItems = cart.soldItems.map((i) =>
      i.batchId === item.batchId
        ? {
            ...i,
            quantity: newQuantity,
            qtePerUnit: newQtePerUnit,
            total: newQtePerUnit * newQuantity * i.sellingPriceTTC,
          }
        : i,
    );
    setCart({
      ...cart,
      soldItems: newSoldItems,
      total: newSoldItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  // ── modifyQteUnit — same as Sale, adapted for DetailedSale batch lookup ──
  function modifyQteUnit(item: soldItem, type: string) {
    if (item.unit === "piece") return;

    const verify = variants?.find((v) =>
      v.batches.find((b) => b.id === item.batchId),
    );
    const maxStock =
      verify?.batches.find((b) => b.id === item.batchId)?.stock?.quantity ||
      item.maxStock ||
      0;
    if (maxStock <= 0) return;

    const currentCartItem = cart.soldItems.find(
      (i) => i.batchId === item.batchId,
    );
    if (!currentCartItem) return;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    if (type === "add") {
      newQtePerUnit = newQtePerUnit + 1;
    } else if (type === "remove") {
      newQtePerUnit = newQtePerUnit - 1;
      if (newQtePerUnit < 1) newQtePerUnit = 1;
    }

    if (newQuantity * newQtePerUnit > maxStock) {
      newQuantity = Math.floor(maxStock / newQtePerUnit);
      if (newQuantity < 1) {
        newQuantity = 1;
        newQtePerUnit = maxStock;
      }
    }

    const newSoldItems = cart.soldItems.map((i) =>
      i.batchId === item.batchId
        ? {
            ...i,
            quantity: newQuantity,
            qtePerUnit: newQtePerUnit,
            total: newQtePerUnit * newQuantity * i.sellingPriceTTC,
          }
        : i,
    );
    setCart({
      ...cart,
      soldItems: newSoldItems,
      total: newSoldItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  // ── applyNumPadModifications — now handles QteUnit case ─────────────────
  function applyNumPadModifications() {
    // 1. Find the inventory batch verification info (True piece stock)
    const verify = variants?.find(
      (v) => v.batches[0].id === selectedSoldItem?.batchId,
    );
    if (!verify || !selectedSoldItem) return;

    // Use the actual batch quantity as maxStock, fallback to maxStock property
    const maxStock =
      verify?.batches[0]?.stock?.quantity || selectedSoldItem.maxStock || 0;
    if (maxStock <= 0) return; // Safety check: can't calculate if stock is 0

    // 2. Find the live item from the cart array (Source of Truth for current quantities)
    const currentCartItem = cart.soldItems.find(
      (i) => i.batchId === selectedSoldItem.batchId,
    );
    if (!currentCartItem) return;

    // 3. Parse the numpad input
    let inputValue = Number(numPad_value);
    if (isNaN(inputValue) || inputValue < 0) inputValue = 0;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    // 4. Run Relative Calculations
    if (numPad_option === "Quantity") {
      newQuantity = inputValue === 0 ? 1 : inputValue;

      // If Total pieces (Qty * PackSize) > physical stock
      if (newQuantity * newQtePerUnit > maxStock) {
        // Demote the Package Size (QtePerUnit) down to fit the new Quantity
        newQtePerUnit = Math.floor(maxStock / newQuantity);

        // If the typed Quantity is so huge that QtePerUnit drops below 1
        if (newQtePerUnit < 1) {
          newQtePerUnit = 1;
          newQuantity = maxStock; // Cap Quantity at absolute max stock instead
        }
      }
    } else if (numPad_option === "QteUnit") {
      if (currentCartItem.unit === "piece") {
        newQtePerUnit = 1;
      } else {
        newQtePerUnit = inputValue === 0 ? 1 : inputValue;
      }

      // If Total pieces (Qty * PackSize) > physical stock
      if (newQuantity * newQtePerUnit > maxStock) {
        // Demote the Quantity down to fit the new Package Size
        newQuantity = Math.floor(maxStock / newQtePerUnit);

        // If the typed Package Size is so huge that Quantity drops below 1
        if (newQuantity < 1) {
          newQuantity = 1;
          newQtePerUnit = maxStock; // Cap Package Size at absolute max stock instead
        }
      }
    }

    // 5. Map and Update Cart State
    const newSoldItems = cart.soldItems.map((i) => {
      if (i.batchId === selectedSoldItem.batchId) {
        if (numPad_option === "Quantity" || numPad_option === "QteUnit") {
          return {
            ...i,
            quantity: newQuantity,
            qtePerUnit: newQtePerUnit,
            total: newQuantity * newQtePerUnit * i.sellingPriceTTC,
          };
        } else {
          // Handle Price Modifications
          return {
            ...i,
            sellingPriceTTC: inputValue,
            total: i.quantity * i.qtePerUnit * inputValue,
          };
        }
      }
      return i;
    });

    setCart({
      ...cart,
      soldItems: newSoldItems,
      total: newSoldItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  async function makeSale() {
    if (!paymentMethod) {
      alert(t("paymentRequiredAlert"));
      return;
    }
    if (cart.soldItems.length === 0) return;
    if (isCreditActivated && !clientId) {
      alert(t("creditRequired"));
      return;
    }
    const totalTTC = cart.total + (timbre ?? 0);

    const res = await createSale({
      total: isRemiseActivated ? remiseAmount + (timbre ?? 0) : totalTTC,
      clientId: isCreditActivated ? (clientId ?? undefined) : undefined,
      paid: isCreditActivated
        ? paidAmount
        : isRemiseActivated
          ? remiseAmount + (timbre ?? 0)
          : totalTTC,
      remise: isRemiseActivated,
      payment_methode: "cash",
      timbre,
      remiseAmount: isRemiseActivated ? remise : 0,
      isDetailed: true,
      soldItems: cart.soldItems.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        unit: item.unit,
        qtePerUnit: item.qtePerUnit,
        sellingPrice: item.sellingPriceTTC,
        total: item.total,
      })),
      date: new Date().toISOString(),
    });
    if (res.status === 1) {
      toast.success(t("successSale"));
      alert(t("successSale"));
      if (paperType) {
        await printSale(res.response.id, paperType);
      }
      fetchVariants();
      resetStatus();
    } else {
      toast.error(t("errorSale"));
      alert(t("errorSale"));
    }
  }

  async function updateSale() {
    if (!paymentMethod) {
      alert(t("paymentRequiredAlert"));
      return;
    }
    if (cart.soldItems.length === 0) return;
    if (isCreditActivated && !clientId) {
      alert(t("creditRequired"));
      return;
    }
    const res = await updateSaleByid(saleId!, {
      total: isRemiseActivated ? remiseAmount : cart.total,
      clientId: isCreditActivated ? (clientId ?? undefined) : undefined,
      paid: isCreditActivated
        ? paidAmount
        : isRemiseActivated
          ? remiseAmount
          : cart.total,
      remise: isRemiseActivated,
      payment_methode: paymentMethod,
      isDetailed: true,
      timbre,
      remiseAmount: isRemiseActivated ? remise : 0,
      soldItems: cart.soldItems.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        sellingPrice: item.sellingPriceTTC,
        total: item.total,
        id: item.id,
      })),
      date: new Date().toISOString(),
    });
    if (res.status === 1) {
      toast.success(t("successSaleUpdate"));
      alert(t("successSaleUpdate"));
      fetchVariants();
      resetStatus();
    } else {
      toast.error(t("errorSaleUpdate"));
      alert(t("errorSaleUpdate"));
    }
  }

  function resetStatus() {
    setCart({ soldItems: [], total: 0 });
    setClientId(0);
    setIsCreditActivated(false);
    setPaidAmount(0);
    setPaperType(null);
    setIsRemiseActivated(false);
    setRemiseAmount(0);
    setRemise(0);
    setNumPad_value("");
    setNumPad_option("Quantity");
    setIsHistoryLoaded(false);
    setSelectedSoldItem(null);
    setSaleId(null);
    setTimbre(0);
  }
  const [isBarcodeToggled, setIsBarcodeToggled] = useState(false);
  // 1. Define the specific function you want to call on a successful scan
  const handleScannedItem = async (barcode: string) => {
    console.log("Scanned Barcode:", barcode);
    // Your logic here (e.g., fetch product, add to invoice)
    const res = await getVaraiantByBarcode(barcode);
    stVariants([res.response]);
  };

  // 2. The listener effect controlled by your toggle state
  useEffect(() => {
    // If the toggle is false, don't set up the listener at all
    if (!isBarcodeToggled) {
      fetchVariants();
      return;
    }

    let inputString = "";
    let lastKeyTime = Date.now();
    const timeout = 100; // ms threshold for scanner speed

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();

      // Reset if the user is typing too slowly (human typing)
      if (currentTime - lastKeyTime > timeout) {
        inputString = "";
      }

      if (e.key === "Enter") {
        if (inputString.length > 0) {
          handleScannedItem(inputString);
          inputString = ""; // Reset buffer
        }
        return;
      }

      // Capture printable single characters
      if (e.key.length === 1) {
        inputString += e.key;
      }

      lastKeyTime = currentTime;
    };

    // Attach listener globally
    document.addEventListener("keydown", handleKeyDown);

    // CLEANUP: This runs automatically when `isBarcodeToggled` changes to false
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBarcodeToggled]); // Triggers whenever this state changes
  return (
    <div className={styles.container}>
      <title>Nexus | Detailed POS</title>
      <section className={styles.sect1}>
        <div className={styles.title}>
          <h2>{t("title")}</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className={styles.searchBar}>
            <Search />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className={styles.searchField}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div
            className={
              isBarcodeToggled
                ? styles.addProductButtonActive
                : styles.addProductButton
            }
            onClick={() => setIsBarcodeToggled(!isBarcodeToggled)} // Simpler inversion syntax
          >
            <p>{isBarcodeToggled ? "Listening..." : "Toggle"}</p>
            <Barcode />
          </div>
        </div>
        {/* ── Variants table — unchanged from DetailedSale ── */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableCell}>
                  {t("variantsTable.productName")}
                </th>
                <th className={styles.tableCell}>{t("variantsTable.id")}</th>
                <th className={styles.tableCell}>{t("variantsTable.nLot")}</th>
                <th className={styles.tableCell}>
                  {t("variantsTable.barcode")}
                </th>
                <th className={styles.tableCell}>
                  {t("variantsTable.stockQty")}
                </th>
                <th className={styles.tableCell}>
                  {t("variantsTable.fabricationDate")}
                </th>
                <th className={styles.tableCell}>
                  {t("variantsTable.expirationDate")}
                </th>
                <th className={styles.tableCell}>
                  {t("variantsTable.purchasePrice")}
                </th>
                <th className={styles.tableCell}>{t("variantsTable.tva")}</th>
                <th className={styles.tableCell}>
                  {t("variantsTable.sellingPrice")}
                </th>
                <th className={styles.tableCell}>
                  {t("variantsTable.discountPrice")}
                </th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {variants?.map((item) =>
                item.batches.map((batch) => (
                  <tr
                    className={styles.tableRow}
                    key={batch.id}
                    onDoubleClick={() => addToCart(item, batch)}
                  >
                    <td className={styles.tableCell}>
                      {" "}
                      {item.product.name} - {item.name}
                    </td>
                    <td className={styles.tableCell}>{batch.id}</td>
                    <td className={styles.tableCell}>{batch.nLot}</td>
                    <td className={styles.tableCell}>{item.barcode}</td>
                    <td className={styles.tableCell}>{batch.stock.quantity}</td>
                    <td className={styles.tableCell}>
                      {batch.fabricationDate?.split("T")[0] ?? "-"}
                    </td>
                    <td className={styles.tableCell}>
                      {batch.expirationDate?.split("T")[0] ?? "-"}
                    </td>
                    <td className={styles.tableCell}>
                      {item.purchasePrice} {t("currency")}
                    </td>
                    <td className={styles.tableCell}>{item.vatRate} %</td>
                    <td className={styles.tableCell}>
                      {item.sellingPriceTTC} {t("currency")}
                    </td>
                    <td className={styles.tableCell}>
                      {item.promotionPrice
                        ? `${item.promotionPrice} ${t("currency")}`
                        : "-"}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>

          {meta.pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <div className={styles.pageNumbers}>
                {Array.from({ length: meta.pages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === meta.pages || Math.abs(p - page) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                      acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`${styles.pageNumber} ${page === p ? styles.pageActive : ""}`}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </button>
                    ),
                  )}
              </div>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page === meta.pages}
              >
                <ChevronRight size={16} />
              </button>
              <span className={styles.pageInfo}>
                {t("pageInfo", { page, pages: meta.pages })}
              </span>
            </div>
          )}
        </div>

        <div className={styles.title}>
          <h2>{t("cartTitle")}</h2>
        </div>

        {/* ── Cart table — now has unit + QteUnit columns ── */}
        <div
          className={styles.cartWrapper}
          onClick={() => setSelectedSoldItem(null)}
        >
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableCell}>
                  {t("cartTable.productName")}
                </th>
                <th className={styles.tableCell}>{t("cartTable.barcode")}</th>
                <th className={styles.tableCell}>{t("cartTable.quantity")}</th>
                <th className={styles.tableCell}>{t("cartTable.unit")}</th>

                <th className={styles.tableCell}>{t("cartTable.QteUnit")}</th>

                <th className={styles.tableCell}>
                  {t("cartTable.sellingPrice")}
                </th>
                <th className={styles.tableCell}>{t("cartTable.total")}</th>
                <th className={styles.tableCell}>{t("cartTable.remove")}</th>
              </tr>
            </thead>
            <tbody
              className={
                cart.soldItems.length === 0 && isHistoryLoaded === false
                  ? styles.emptyCartBody
                  : styles.cartBody
              }
            >
              {cart.soldItems.length === 0 ? (
                <tr className={styles.emptyCart}>
                  <td>{t("emptyCart")}</td>
                </tr>
              ) : (
                cart.soldItems.map((item) => (
                  <tr
                    className={`${styles.tableRow} ${selectedSoldItem != null && selectedSoldItem?.batchId === item.batchId ? styles.selectedRow : styles.tableRow}`}
                    key={item.batchId}
                    onDoubleClick={() => setSelectedSoldItem(item)}
                  >
                    <td className={styles.tableCell}>{item.name}</td>
                    <td className={styles.tableCell}>{item.barcode}</td>
                    <td className={styles.tableCell}>
                      <div
                        className={styles.quantityControl}
                        onDoubleClick={() => setSelecetedQteType("qte")}
                      >
                        <Minus
                          size={16}
                          className={styles.quantityControlIcon}
                          onClick={() => modifyQte(item, "remove")}
                        />
                        {item.quantity}
                        <Plus
                          size={16}
                          className={styles.quantityControlIcon}
                          onClick={() => modifyQte(item, "add")}
                        />
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <select
                        name="units"
                        id="units"
                        className={styles.UnitSelector}
                        onChange={(e) => {
                          console.log(e.target.value);
                          setCart((prev) => ({
                            ...prev,
                            soldItems: prev.soldItems.map((i) =>
                              i.batchId === item.batchId
                                ? { ...i, unit: e.target.value }
                                : i,
                            ),
                          }));
                        }}
                      >
                        <option value="piece">
                          {t("cartTable.optionUnit")}
                        </option>
                        <option value="package">
                          {t("cartTable.optionCarton")}
                        </option>
                      </select>
                    </td>

                    <td
                      className={styles.tableCell}
                      onDoubleClick={() => setSelecetedQteType("qteUnit")}
                    >
                      {item.unit === "package" ? (
                        <div className={styles.quantityControl}>
                          <Minus
                            size={16}
                            className={styles.quantityControlIcon}
                            onClick={() => modifyQteUnit(item, "remove")}
                          />
                          {item.qtePerUnit}
                          <Plus
                            size={16}
                            className={styles.quantityControlIcon}
                            onClick={() => modifyQteUnit(item, "add")}
                          />
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={styles.tableCell}>
                      {item.sellingPriceTTC.toFixed(2)}
                    </td>
                    <td className={styles.tableCell}>
                      {item.total.toFixed(2)} {t("currency")}
                    </td>
                    <td className={styles.tableCell}>
                      <X
                        className={styles.deleteIcon}
                        onClick={() => DeleteFromCart(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.totalSec}>
          <div className={styles.totalSec_item}>
            <h2>{t("totalAmount")} :</h2>
            <h2 className={styles.total}>
              {cart.total.toFixed(2)} {t("currency")}
            </h2>
          </div>
          {isRemiseActivated && (
            <div className={styles.totalSec_item}>
              <h2>{t("remise")} :</h2>
              <h2 className={styles.total}>
                {remiseAmount.toFixed(2)} {t("currency")}
              </h2>
            </div>
          )}
          {isCreditActivated && (
            <div className={styles.totalSec_item}>
              <h2>{t("totalPaid")} :</h2>
              <h2 className={styles.total}>
                {paidAmount.toFixed(2)} {t("currency")}
              </h2>
            </div>
          )}
          {timbre > 0 && (
            <>
              <div className={styles.totalSec_item}>
                <h2>{t("timbre")} :</h2>
                <h2 className={styles.total}>
                  {timbre.toFixed(2)} {t("currency")}
                </h2>
              </div>
              <div className={styles.totalSec_item}>
                <h2>{t("ttc")} :</h2>
                <h2 className={styles.total}>
                  {isRemiseActivated
                    ? remiseAmount.toFixed(2) + timbre.toFixed(2)
                    : cart.total.toFixed(2) + timbre.toFixed(2)}{" "}
                  {t("currency")}
                </h2>
              </div>
            </>
          )}
        </div>
      </section>

      <section className={styles.sec2}>
        <div className={styles.numPad}>
          <div className={styles.numPadHeader}>
            <h2>{t("numpadTitle")}</h2>
            <div className={styles.numpadOptions}>
              <div
                className={`${styles.numpadOption} ${numPad_option === "Quantity" ? styles.active : ""}`}
                onClick={() => (
                  setNumPad_option("Quantity"),
                  setNumPad_value("")
                )}
              >
                {t("qte")}
              </div>
              {/* ← QteUnit option added */}
              <div
                className={`${styles.numpadOption} ${numPad_option === "QteUnit" ? styles.active : ""}`}
                onClick={() => (
                  setNumPad_option("QteUnit"),
                  setNumPad_value("")
                )}
              >
                {t("qteUnit")}
              </div>
              <div
                className={`${styles.numpadOption} ${numPad_option === "Price" ? styles.active : ""}`}
                onClick={() => (setNumPad_option("Price"), setNumPad_value(""))}
              >
                {t("price")}
              </div>
            </div>
          </div>

          <div className={styles.result_field}>
            <div className={styles.resultFieldValue}>
              <h3>
                {numPad_option === "Quantity"
                  ? t("qte")
                  : numPad_option === "QteUnit"
                    ? t("qteUnit")
                    : t("price")}
              </h3>
              <h2>{numPad_value || "0"}</h2>
            </div>
          </div>

          <div className={styles.numpadButtons}>
            <div className={styles.numpadGrid}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className={styles.numpadButton}
                  onClick={() =>
                    selectedSoldItem
                      ? setNumPad_value((numPad_value + i).toString())
                      : null
                  }
                >
                  {i}
                </div>
              ))}
              <div
                className={styles.numpadButton}
                onClick={() => setNumPad_value("")}
              >
                C
              </div>
              <div
                className={styles.numpadButton}
                onClick={() =>
                  selectedSoldItem
                    ? setNumPad_value((numPad_value + 0).toString())
                    : null
                }
              >
                0
              </div>
              <div
                className={styles.numpadButton}
                onClick={() =>
                  selectedSoldItem && numPad_option !== "Quantity"
                    ? numPad_value.includes(".")
                      ? undefined
                      : setNumPad_value(numPad_value + ".")
                    : null
                }
              >
                .
              </div>
              <div
                className={styles.numpadButton}
                onClick={() => (
                  selectedSoldItem ? applyNumPadModifications() : null,
                  setNumPad_value("")
                )}
              >
                {t("apply")}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.title}>
          <h2>{t("paymentTitle")}</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Select
            styles={selectStyles}
            options={paymentMethodSelectOptions}
            onChange={(opt: any) => setPaymentMethode(opt?.value ?? undefined)}
            value={paymentMethodSelectOptions.find((p) =>
              p.value === paymentMethod
                ? {
                    label: p.label,
                    value: p.value,
                  }
                : null,
            )}
          />
        </div>

        <div className={styles.title}>
          <h2>{t("optionsTitle")}</h2>
        </div>

        <div className={styles.transaction_options}>
          {(
            Object.keys(transaction_options) as Array<keyof transactionOptions>
          ).map((key) => (
            <div
              className={styles.transaction_option}
              key={key}
              onClick={() =>
                key === "print"
                  ? setOpenPrintModal(true)
                  : key === "credit"
                    ? setOpenCreditModal(true)
                    : key === "discount"
                      ? setOpenRemiseModal(true)
                      : key === "history"
                        ? setOpenHistoryModal(true)
                        : key === "timbre"
                          ? setOpenTimbreModal(true)
                          : null
              }
            >
              <h3>{t(`transactionOptions.${key}`)}</h3>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Link
            href={isHistoryLoaded ? "#" : "/sales"}
            className={styles.cancelBtn}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={isHistoryLoaded ? resetStatus : () => {}}
          >
            {t("cancelBtn")}
          </Link>
          <button
            className={isHistoryLoaded ? styles.updateBtn : styles.proceedBtn}
            onClick={isHistoryLoaded ? updateSale : makeSale}
            disabled={cart.soldItems.length === 0}
          >
            {isHistoryLoaded ? t("updateBtn") : t("proceedBtn")}
          </button>
        </div>
      </section>

      {openPrintModal && (
        <PrintModal
          setOpenPrintModal={setOpenPrintModal}
          paperType={paperType}
          setPaperType={setPaperType}
        />
      )}
      {openCreditModal && (
        <CreditModal
          paidAmount={paidAmount}
          setClientId={setClientId}
          setPaidAmount={setPaidAmount}
          setOpenCreditModal={setOpenCreditModal}
          isCreditActivated={isCreditActivated}
          setIsCreditActivated={setIsCreditActivated}
          clientId={clientId}
          isPurchase={false}
        />
      )}
      {openRemiseModal && (
        <RemiseModal
          setOpenRemiseModal={setOpenRemiseModal}
          remise={remise}
          setRemise={setRemise}
          isRemiseActivated={isRemiseActivated}
          setIsRemiseActivated={setIsRemiseActivated}
          remiseAmount={remiseAmount}
          setRemiseAmount={setRemiseAmount}
        />
      )}
      {openHistoryModal && (
        <HistoryModal
          setIsSaleLoaded={setIsHistoryLoaded}
          setOpenHistoryModal={setOpenHistoryModal}
          setCart={setCart as any}
          setPaidAmount={setPaidAmount}
          setClientId={setClientId}
          setRemise={setRemise}
          setRemiseAmount={setRemiseAmount}
          setIsCreditActivated={setIsCreditActivated}
          setIsRemiseActivated={setIsRemiseActivated}
          setSaleId={setSaleId}
          isDetailed={true}
          type="sale"
          setPaymentMethod={setPaymentMethode}
          setTimbre={setTimbre}
        />
      )}
      {openTimbreModal && (
        <TimbreModal
          setOpenTimbreModal={setOpenTimbreModal}
          timbreAmount={timbre}
          setTimbreAmount={setTimbre}
        />
      )}
      <ToastContainer />
    </div>
  );
}
