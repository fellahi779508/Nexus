"use client";
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  Edit,
  Edit2,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import styles from "./purchase.module.css";
import Select from "react-select";
import Link from "next/link";
import { useTranslations } from "next-intl";
import getAllSallableVariants, {
  getAllPurchasableVariants,
  getAllSallableVariantsAll,
  getVaraiantByBarcode,
} from "@/api/variant-api";
import CreditModal from "@/components/sale/creditModal";
import HistoryModal from "@/components/sale/historyModal";
import PrintModal from "@/components/sale/printModal";
import RemiseModal from "@/components/sale/remiseModal";
import { Variant, Meta, Batch, Supplier, PurchaseCart } from "@/utils/types";
import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import ProductModal from "@/components/products/add-product";
import AddBatchModal from "@/components/batches/add-batch";
import {
  createPurchase,
  printPurchase,
  updatePurchaseById,
} from "@/api/purchase-api";
import { selectStyles } from "@/components/products/selectStyles";
import { getAllSuppliers, updateSupplier } from "@/api/supplier-api";
import AddSupllierModal from "@/components/suppliers/add-supplier";
import TimbreModal from "@/components/sale/timbreModal";

export default function Purchase() {
  const t = useTranslations("purchase");

  type PurchasedItem = {
    id?: number;
    batchId: number;
    quantity: number;
    total: number;
    maxStock: number;
    name: string;
    unit: string;
    qtePerUnit: number;
    barcode: string;
    sellingPriceTTC: number;
  };

  type TransactionOptions = {
    print: boolean;
    credit: boolean;
    discount: boolean;
    timbre: boolean;
    history: boolean;
  };

  const [variants, stVariants] = useState<Variant[] | null>(null);
  const [openPrintModal, setOpenPrintModal] = useState(false);
  const [openCreditModal, setOpenCreditModal] = useState(false);
  const [openRemiseModal, setOpenRemiseModal] = useState(false);
  const [paperType, setPaperType] = useState<"A4" | "Ticket" | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCreditActivated, setIsCreditActivated] = useState(false);
  const [supplierId, setSupplierId] = useState<number | null>(null); // Assuming purchases are from suppliers
  const [purchaseId, setPurchaseId] = useState<number | null>(null);
  const [remise, setRemise] = useState(0);
  const [remiseAmount, setRemiseAmount] = useState(0);
  const [isRemiseActivated, setIsRemiseActivated] = useState(false);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(0);
  const [isUpdate, setIsUpdate] = useState(false);
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [timbre, setTimbre] = useState(0);
  const [openTimbreModal, setOpenTimbreModal] = useState(false);
  const [selectedPurchasedItem, setSelectedPurchasedItem] =
    useState<PurchasedItem | null>(null);
  const [isBarcodeToggled, setIsBarcodeToggled] = useState(false);
  // Custom cart state for purchases
  const [cart, setCart] = useState<PurchaseCart>({
    total: 0,
    purchasedItems: [],
  });

  const [meta, setMeta] = useState<Meta>({
    page: 1,
    pages: 1,
    limit: 10,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [transaction_options, setTransaction_options] =
    useState<TransactionOptions>({
      print: false,
      credit: false,
      discount: false,
      timbre: false,
      history: false,
    });
  const [search, setSearch] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSuccessToast, setSupplierSuccessToast] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [suppliersOption, setSupplierOption] = useState<
    { value: number; label: string }[]
  >([]);
  const [paymentMethod, setPaymentMethode] = useState<string | null>(null);
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
  const [selectedSupplier, setSelectedSupplier] = useState<number | undefined>(
    undefined,
  );
  const fetchSuppliers = useCallback(async () => {
    const res = await getAllSuppliers(1, 0, supplierSearch);
    setSuppliers(res.response.data);
    setSupplierOption(
      res.response.data.map((s: any) => ({
        value: s.id,
        label: s.name,
      })),
    );
    setSupplierSuccessToast(false);
  }, [supplierSearch]);

  useEffect(() => {
    fetchSuppliers();
  }, [updateSupplier, supplierSuccessToast]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [numPad_option, setNumPad_option] = useState<
    "Quantity" | "Price" | "QteUnit"
  >("Quantity");
  const [numPad_value, setNumPad_value] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
  }, [search]);

  const fetchVariants = useCallback(async () => {
    const res = await getAllPurchasableVariants(page, 8, debouncedSearch);
    stVariants(res.response.data);
    setMeta(res.response.meta);
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchVariants();
    setSuccessToast(false);
  }, [page, debouncedSearch, successToast]);

  useEffect(() => {
    if (isHistoryLoaded) {
      setSelectedPurchasedItem(null);
    }
  }, [isHistoryLoaded]);

  function addToCart(item: Variant, batch: Batch) {
    const existingItem = cart.purchasedItems.find(
      (i) => i.batchId === batch.id,
    );

    if (existingItem) {
      setCart({
        ...cart,
        purchasedItems: cart.purchasedItems.map((i) =>
          i.batchId === batch.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: i.total + item.purchasePrice,
              }
            : i,
        ),
      });
    } else {
      setCart({
        ...cart,
        purchasedItems: [
          ...cart.purchasedItems,
          {
            batchId: batch.id,
            quantity: 1,
            total: item.purchasePrice,
            name: `${item.product.name} - ${item.name}`,
            barcode: item.barcode,
            sellingPriceTTC: item.purchasePrice,
            maxStock:
              item.batches.find((b) => b.id === batch.id)?.stock.quantity || 0, // ← added
            unit: "piece", // ← added
            qtePerUnit: 1, // ← added
          },
        ],
      });
    }
  }

  function DeleteFromCart(item: PurchasedItem) {
    setCart({
      ...cart,
      purchasedItems: cart.purchasedItems.filter(
        (i) => i.batchId !== item.batchId,
      ),
    });
  }

  useEffect(() => {
    console.log(cart.purchasedItems);

    const total = cart.purchasedItems.reduce(
      (acc, item) => acc + item.total,
      0,
    );
    setCart({ ...cart, total });
  }, [cart.purchasedItems]);

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

  function modifyQte(item: PurchasedItem, type: string) {
    // Removed maxStock checks
    const currentCartItem = cart.purchasedItems.find(
      (i) => i.batchId === item.batchId,
    );
    if (!currentCartItem) return;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    // Apply addition or subtraction
    if (type === "add") {
      newQuantity = newQuantity + 1;
    } else if (type === "remove") {
      newQuantity = newQuantity - 1;
      if (newQuantity < 1) newQuantity = 1; // Prevent dropping below 1
    }

    // Removed the (newQuantity * newQtePerUnit > maxStock) capping logic

    const newPurchasedItems = cart.purchasedItems.map((i) =>
      i.batchId === item.batchId
        ? {
            ...i,
            quantity: newQuantity,
            qtePerUnit: newQtePerUnit,
            total: newQuantity * newQtePerUnit * i.sellingPriceTTC,
          }
        : i,
    );

    setCart({
      ...cart,
      purchasedItems: newPurchasedItems,
      total: newPurchasedItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  function modifyQteUnit(item: PurchasedItem, type: string) {
    if (item.unit === "piece") return;

    // Removed maxStock checks
    const currentCartItem = cart.purchasedItems.find(
      (i) => i.batchId === item.batchId,
    );
    if (!currentCartItem) return;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    // Apply addition or subtraction
    if (type === "add") {
      newQtePerUnit = newQtePerUnit + 1;
    } else if (type === "remove") {
      newQtePerUnit = newQtePerUnit - 1;
      if (newQtePerUnit < 1) newQtePerUnit = 1; // Prevent dropping below 1
    }

    // Removed the (newQuantity * newQtePerUnit > maxStock) capping logic

    const newPurchasedItems = cart.purchasedItems.map((i) =>
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
      purchasedItems: newPurchasedItems,
      total: newPurchasedItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  function applyNumPadModifications() {
    // 1. Removed the 'variants' lookup and 'maxStock' restrictions
    if (!selectedPurchasedItem) return;

    const currentCartItem = cart.purchasedItems.find(
      (i) => i.batchId === selectedPurchasedItem.batchId,
    );
    if (!currentCartItem) return;

    let inputValue = Number(numPad_value);
    if (isNaN(inputValue) || inputValue < 0) inputValue = 0;

    let newQuantity = currentCartItem.quantity;
    let newQtePerUnit = currentCartItem.qtePerUnit || 1;

    // 2. Simplified logic: apply the input directly without capping it
    if (numPad_option === "Quantity") {
      newQuantity = inputValue === 0 ? 1 : inputValue;
    } else if (numPad_option === "QteUnit") {
      if (currentCartItem.unit === "piece") {
        newQtePerUnit = 1;
      } else {
        newQtePerUnit = inputValue === 0 ? 1 : inputValue;
      }
    }

    // 3. Map over items and apply changes
    const newPurchasedItems = cart.purchasedItems.map((i) => {
      if (i.batchId === selectedPurchasedItem.batchId) {
        if (numPad_option === "Quantity" || numPad_option === "QteUnit") {
          return {
            ...i,
            quantity: newQuantity,
            qtePerUnit: newQtePerUnit,
            // Note: Make sure 'sellingPriceTTC' is the correct property name
            // for your purchase items (sometimes called purchasePriceTTC)
            total: newQuantity * i.sellingPriceTTC,
          };
        } else {
          return {
            ...i,
            sellingPriceTTC: inputValue,
            total: i.quantity * inputValue,
          };
        }
      }
      return i;
    });

    setCart({
      ...cart,
      purchasedItems: newPurchasedItems,
      total: newPurchasedItems.reduce((acc, i) => acc + i.total, 0),
    });
  }

  async function makePurchase() {
    if (!paymentMethod) {
      alert(t("paymentRequiredAlert"));
      return;
    }
    if (cart.purchasedItems.length === 0) return;
    if (isCreditActivated && !supplierId) {
      alert(t("creditRequired"));
      return;
    }
    const totalTTC = cart.total + (timbre ?? 0);
    const res = await createPurchase({
      total: isRemiseActivated ? remiseAmount + (timbre ?? 0) : totalTTC,
      supplierId: isCreditActivated ? (supplierId ?? undefined) : undefined,
      paid: isCreditActivated
        ? paidAmount
        : isRemiseActivated
          ? remiseAmount + (timbre ?? 0)
          : totalTTC,
      remise: isRemiseActivated,
      payment_method: paymentMethod,
      timbre,
      remiseAmount: isRemiseActivated ? remise : 0,
      isDetailed: false,
      purchasedItems: cart.purchasedItems.map((item) => ({
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
      toast.success(t("successPurchase"));
      alert(t("successPurchase"));
      if (paperType) {
        await printPurchase(res.response.id, paperType);
      }
      fetchVariants();
      resetStatus();
    } else {
      toast.error(t("errorPurchase"));
      alert(t("errorPurchase"));
    }
  }

  async function updatePurchase() {
    if (!paymentMethod) {
      alert(t("paymentRequiredAlert"));
      return;
    }
    if (cart.purchasedItems.length === 0) return;
    if (isCreditActivated && !supplierId) {
      alert(t("creditRequired"));
      return;
    }

    const res = await updatePurchaseById(purchaseId!, {
      total: isRemiseActivated ? remiseAmount : cart.total,
      supplierId: supplierId ?? undefined,
      paid: isCreditActivated
        ? paidAmount
        : isRemiseActivated
          ? remiseAmount
          : cart.total,
      remise: isRemiseActivated,
      remiseAmount: isRemiseActivated ? remise : 0,
      isDetailed: false,
      timbre,
      payment_method: paymentMethod!,
      purchasedItems: cart.purchasedItems.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        unit: item.unit,
        qtePerUnit: item.qtePerUnit,
        sellingPrice: item.sellingPriceTTC,
        total: item.total,
        id: item.id,
      })),
      date: new Date().toISOString(),
    });

    if (res.status === 1) {
      alert(t("successPurchaseUpdate"));
      if (paperType) {
        await printPurchase(res.response.id, paperType);
      }
      fetchVariants();
      resetStatus();
    } else {
      alert(t("errorPurchaseUpdate"));
    }
  }

  function resetStatus() {
    setCart({ purchasedItems: [], total: 0 });
    setSupplierId(0);
    setIsCreditActivated(false);
    setPaidAmount(0);
    setPaperType(null);
    setIsRemiseActivated(false);
    setRemiseAmount(0);
    setRemise(0);
    setNumPad_value("");
    setNumPad_option("Quantity");
    setIsHistoryLoaded(false);
    setSelectedPurchasedItem(null);
    setPurchaseId(null);
    setPaymentMethode(null);
  }
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
      <title>Nexus | POP</title>
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
            className={styles.addProductButton}
            onClick={() => setOpenProductModal(true)}
          >
            <p>Add</p>
            <Plus />
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
                <th className={styles.tableCell}>
                  {t("variantsTable.actions")}
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
                    <td className={styles.tableCell}>
                      <div className={styles.variantActions}>
                        <div
                          onClick={() => (
                            setSelectedVariantId(item.id),
                            setIsUpdate(true),
                            setOpenProductModal(true)
                          )}
                          className={styles.variantAction}
                        >
                          <p>{t("variantsTable.editVariant")}</p>
                          <Edit size={16} />
                        </div>
                        <div
                          onClick={() => (
                            setSelectedVariantId(0),
                            setIsUpdate(true),
                            setOpenBatchModal(true),
                            setSelectedBatchId(batch.id)
                          )}
                          className={styles.variantAction}
                        >
                          <p>{t("variantsTable.editBatch")}</p>
                          <Edit2 size={16} />
                        </div>
                      </div>
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

        <div
          className={styles.cartWrapper}
          onClick={() => setSelectedPurchasedItem(null)}
        >
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableCell}>
                  {t("cartTable.productName")}
                </th>
                <th className={styles.tableCell}>{t("cartTable.id")}</th>
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
                cart.purchasedItems.length === 0 && isHistoryLoaded === false
                  ? styles.emptyCartBody
                  : styles.cartBody
              }
            >
              {cart.purchasedItems.length === 0 ? (
                <tr className={styles.emptyCart}>
                  <td colSpan={8}>{t("emptyCart")}</td>
                </tr>
              ) : (
                cart.purchasedItems.map((item) => (
                  <tr
                    className={`${styles.tableRow} ${selectedPurchasedItem != null && selectedPurchasedItem?.batchId === item.batchId ? styles.selectedRow : styles.tableRow}`}
                    key={item.batchId}
                    onDoubleClick={() => setSelectedPurchasedItem(item)}
                  >
                    <td className={styles.tableCell}>{item.name}</td>
                    <td className={styles.tableCell}>{item.batchId}</td>
                    <td className={styles.tableCell}>{item.barcode}</td>
                    <td className={styles.tableCell}>
                      <div className={styles.quantityControl}>
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
                        value={item.unit}
                        className={styles.UnitSelector}
                        onChange={(e) => {
                          setCart((prev) => ({
                            ...prev,
                            purchasedItems: prev.purchasedItems.map((i) =>
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

                    <td className={styles.tableCell}>
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
                    selectedPurchasedItem
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
                  selectedPurchasedItem
                    ? setNumPad_value((numPad_value + 0).toString())
                    : null
                }
              >
                0
              </div>
              <div
                className={styles.numpadButton}
                onClick={() =>
                  selectedPurchasedItem && numPad_option !== "Quantity"
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
                  selectedPurchasedItem ? applyNumPadModifications() : null,
                  setNumPad_value("")
                )}
              >
                {t("apply")}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.title}>
          <h2>{t("supplierTitle")}</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Select
            styles={selectStyles}
            onInputChange={(val: any) => setSupplierSearch(val)}
            options={suppliersOption}
            onChange={(opt: any) => {
              setSelectedSupplier(opt?.value ?? undefined);
              setSupplierId(opt?.value ?? undefined);
            }}
            value={
              suppliers.find((s) => s.id === supplierId)
                ? {
                    value: supplierId,
                    label: suppliers.find((s) => s.id === supplierId)?.name,
                  }
                : null
            }
          />
          <Plus
            className={styles.addSupplierButton}
            onClick={() => setShowAddSupplierModal(true)}
          />
          <Trash2 onClick={() => setSupplierId(null)} />
        </div>

        <div className={styles.title}>
          <h2>{t("optionsTitle")}</h2>
        </div>

        <div className={styles.transaction_options}>
          {(
            Object.keys(transaction_options) as Array<keyof TransactionOptions>
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
        <div className={styles.actions}>
          <Link
            href={isHistoryLoaded ? "#" : "/purchases"}
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
            onClick={isHistoryLoaded ? updatePurchase : makePurchase}
            disabled={cart.purchasedItems.length === 0}
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
          setClientId={setSupplierId}
          setPaidAmount={setPaidAmount}
          setOpenCreditModal={setOpenCreditModal}
          isCreditActivated={isCreditActivated}
          setIsCreditActivated={setIsCreditActivated}
          clientId={supplierId}
          isPurchase={true}
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
          setCart={setCart as any} // Adjust depending on HistoryModal's strict Cart type
          setPaidAmount={setPaidAmount}
          setClientId={setSupplierId}
          setRemise={setRemise}
          setRemiseAmount={setRemiseAmount}
          setIsCreditActivated={setIsCreditActivated}
          setIsRemiseActivated={setIsRemiseActivated}
          setSaleId={setPurchaseId}
          isDetailed={false}
          type="purchase"
          setPaymentMethod={setPaymentMethode}
          setTimbre={setTimbre}
        />
      )}
      {openProductModal && (
        <ProductModal
          isUpdate={isUpdate}
          variant_id={selectedVariantId}
          step={isUpdate ? 2 : 1}
          setSuccessToast={setSuccessToast}
          setModalOpen={setOpenProductModal}
        />
      )}
      {openBatchModal && (
        <AddBatchModal
          isUpdate={isUpdate}
          setModalOpen={setOpenBatchModal}
          setSuccessToast={setSuccessToast}
          batchId={selectedBatchId}
          variantId={selectedVariantId}
        />
      )}
      {showAddSupplierModal && (
        <AddSupllierModal
          isUpdate={false}
          setModalOpen={setShowAddSupplierModal}
          setSuccessToast={setSupplierSuccessToast}
        />
      )}
      {openTimbreModal && (
        <TimbreModal
          setOpenTimbreModal={setOpenTimbreModal}
          setTimbreAmount={setTimbre}
          timbreAmount={timbre}
        />
      )}
      <ToastContainer />
    </div>
  );
}
