"use client";
import {
  postProduct as api,
  getProduct,
  updateProductApi,
} from "@/api/products-api";
import styles from "./add-product.module.css";
import { fetchCategories } from "@/api/categories-api";
import {
  Category,
  PostProduct,
  PostVarinat,
  Product,
  Supplier,
} from "@/utils/types";
import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useTranslations } from "next-intl";
import { toast, ToastContainer } from "react-toastify";
import {
  AlignVerticalSpaceAround,
  Barcode,
  Plus,
  Trash2,
  UserStar,
  X,
} from "lucide-react";
import {
  getNewbarCode,
  getVaraiantById,
  postVariant,
  putVariant,
} from "@/api/variant-api";
import { selectStyles } from "./selectStyles";
import { getAllSuppliers, GetSupplierById } from "@/api/supplier-api";
import AddSupllierModal from "../suppliers/add-supplier";
import AddCategoryModal from "../category/add-category";
import CalculatorModal from "../calculator/calculator";

// Date formatting helper function
const formatDateToISO = (
  dateString: string | null | undefined,
): string | null => {
  if (!dateString) return null;
  return new Date(dateString).toISOString();
};

//main modal
export default function ProductModal({
  //come back to these params later
  isUpdate,
  product_id,
  setModalOpen,
  setSuccessToast,
  step,
  variant_id,
}: {
  isUpdate: boolean;
  product_id?: number;
  setSuccessToast: (successToast: boolean) => void;
  step?: number;
  variant_id?: number;

  setModalOpen: (open: boolean) => void;
}) {
  const [currentStep, setCurrentStep] = useState(step || 1);
  // this state stores the id of the created product
  const [productId, setProductId] = useState<number | null>(product_id || null);
  return (
    currentStep != 0 && (
      <div className={styles.overlay}>
        {/** here to render the form
         * here is the scenario :
         * first form is the product from where the user must fill the product name and select a category
         * user clicks on next and the a post request will be sent to database and we must recieve and store product id
         * section 2 will be now rendered
         * it has variant of the product fields
         * variant has many optional fields that can be empty
         * when we finishes he click on create product and then everything is over and close this modal only if seccess
         */}

        {(currentStep === 1 && (
          <Step1From
            setStep={setCurrentStep}
            setProductId={setProductId}
            setModalOpen={setModalOpen}
            isUpdate={isUpdate}
            product_id={product_id}
            setSuccessProduct={setSuccessToast}
          />
        )) ||
          (currentStep === 2 && (
            <Step2Form
              product_id={productId}
              setModalOpen={setModalOpen}
              isUpdate={isUpdate}
              variant_id={variant_id}
              setSuccessToastMain={setSuccessToast}
            />
          ))}
        <ToastContainer />
      </div>
    )
  );
}

function Step1From({
  setStep,
  setProductId,
  setModalOpen,
  isUpdate,
  product_id,
  setSuccessProduct,
}: {
  setStep: (step: number) => void;
  setProductId: (id: number) => void;
  setModalOpen: (open: boolean) => void;
  isUpdate: boolean;
  product_id?: number;
  setSuccessProduct: (success: boolean) => void;
}) {
  const t = useTranslations();
  const [categories, setCategories] = useState<Category[]>([]);
  // this state stores product's post request's body
  const [postProduct, setPostProduct] = useState<PostProduct | null>({
    name: "",
    categoryId: 0,
    createdAt: "",
    updatedAt: "",
  });
  // this state stores the id of the selected category
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // this state stores the search query for categories
  const [search, setSearch] = useState("");
  // react-select options to display the category as a select list
  const categoriesOption = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const [successToast, setSuccessToast] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  //function that hundles the creation of the product
  async function createProduct() {
    if (!fieldsVerifier()) {
      return;
    }
    const result = await api({
      ...postProduct!,
      categoryId: selectedCategory ?? undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (result.status === 1) {
      setProductId(result.response.id);
      toast.success(t("addProduct.toast.productCreated"));
      setStep(2);
      setSuccessProduct(true);
    } else {
      console.log(result.error);
      toast.error(
        (result.error as string) || t("addProduct.toast.unknownError"),
      );
    }
  }
  // verify the input fields if they are empty
  function fieldsVerifier() {
    let result = true;
    if (!postProduct?.name) {
      toast.error(t("addProduct.toast.fieldsRequired.name"));
      result = false;
    }
    return result;
  }
  async function fetchProduct() {
    if (!fieldsVerifier) return;
    const result = await getProduct(product_id!);
    if (result.status === 1) {
      setPostProduct({
        name: result.response.name,
        categoryId: result.response.category?.id || 0,
        createdAt: result.response.createdAt,
        updatedAt: result.response.updatedAt,
      });
      setSelectedCategory(result.response.category?.id || 0);
      setSuccessToast(true);
    } else {
      console.log(result.error);
      toast.error(
        (result.error as string) || t("addProduct.toast.unknownError"),
      );
    }
  }
  async function updateProduct() {
    if (!fieldsVerifier) return;
    const result = await updateProductApi(product_id!, {
      ...postProduct!,
      updatedAt: new Date().toISOString(),
    });
    if (result.status === 1) {
      toast.success(t("updateProduct.toast.success"));
      setSuccessProduct(true);
      setModalOpen(false);
    } else {
      console.log(result.error);
      toast.error(
        (result.error as string) || t("addProduct.toast.unknownError"),
      );
    }
  }

  // this function fetches categories from the database
  const getCategories = useCallback(async () => {
    fetchCategories(1, 0, search).then((data) => {
      data.status === 1
        ? (setCategories(data.response.data), setSuccessToast(false))
        : () => {
            setCategories([]);
            console.log(data.error);
          };
    });
  }, [search]);
  // fetch category once the modal is loaded and update by (search changes)

  useEffect(() => {
    if (isUpdate && product_id) {
      fetchProduct();
    }
  }, [isUpdate, product_id]);

  useEffect(() => {
    if (successToast) {
      getCategories();
    }
  }, [search, successToast]);
  return (
    <div className={styles.container}>
      {/* this section contains 2 main fields // one for product name and one for
            all available categories make the categories inside react-select component */}
      <div className={styles.closeBtn} onClick={() => setModalOpen(false)}>
        <X />
      </div>
      <div className={styles.header}>
        {!isUpdate && (
          <div className={styles.steps}>
            <div className={`${styles.stepDot} ${styles.active}`} />
            <div className={styles.stepDot} />
          </div>
        )}
        <h2 className={styles.title}>
          {isUpdate ? t("updateProduct.title") : t("addProduct.step1.title")}
        </h2>
        <p className={styles.subtitle}>
          {isUpdate
            ? t("updateProduct.subtitle")
            : t("addProduct.step1.subtitle")}
        </p>
      </div>
      <div className={styles.inputs_section}>
        {Object.entries(postProduct ?? {}).map(([key, value]) =>
          key === "createdAt" ||
          key === "updatedAt" ||
          key === "categoryId" ? null : (
            <div key={key} className={styles.field}>
              <label className={styles.label}>
                {t(`addProduct.step1.${key}`)}
              </label>
              <input
                type="text"
                value={isUpdate ? postProduct?.name : value}
                className={styles.input}
                onChange={(e) =>
                  setPostProduct({
                    ...postProduct,
                    [key]: e.target.value,
                  } as PostProduct)
                }
                placeholder={t("addProduct.step1.productNamePlaceholder")}
              />
            </div>
          ),
        )}
        <div>
          <label className={styles.label}>
            {t("addProduct.step1.category")}
          </label>
          <div className={styles.suppliersSection}>
            <Select
              styles={selectStyles}
              onInputChange={(val) => setSearch(val)}
              options={categoriesOption}
              onChange={(opt) => (
                setSelectedCategory(opt?.value ?? null),
                setPostProduct({
                  ...postProduct,
                  categoryId: opt?.value,
                } as PostProduct)
              )}
              value={
                categories.find((c) => c.id === selectedCategory)
                  ? {
                      value: selectedCategory,
                      label: categories.find((c) => c.id === selectedCategory)
                        ?.name,
                    }
                  : null
              }
              placeholder={t("addProduct.step1.categoryPlaceholder")}
            />
            <Plus
              className={styles.addSupplier}
              onClick={() => setShowCategoryModal(true)}
            />
            {isUpdate && (
              <Trash2
                className={styles.deleteSupplier}
                onClick={() => {
                  setSelectedCategory(null);
                  setPostProduct({
                    ...postProduct,
                    categoryId: 0,
                  } as PostProduct);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <button
          onClick={() => setModalOpen(false)}
          className={styles.btnSecondary}
        >
          {t("addProduct.actions.cancel")}
        </button>
        <button
          onClick={() => {
            if (isUpdate) {
              updateProduct();
            } else {
              createProduct();
            }
          }}
          className={styles.btnPrimary}
        >
          {isUpdate
            ? t("addProduct.actions.update")
            : t("addProduct.actions.next")}
        </button>
      </div>
      {showCategoryModal && (
        <AddCategoryModal
          isUpdate={false}
          setModalOpen={setShowCategoryModal}
          setSuccessToast={setSuccessToast}
        />
      )}
      <ToastContainer />
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function num(v: number | string) {
  const n = parseFloat(v as string);
  return isNaN(n) ? 0 : n;
}

/* ── types ───────────────────────────────────────────────────────────────── */

type Primary = {
  name: string;
  barcode: string;
  purchasePrice: number | string;
  sellingPriceHT: number | string;
  profit: number | string;
  profitRate: number | string;
  vatRate: number | string;
  sellingPriceTTC: number | string;
  discount: number | string;
  discountRate: number | string;
  PPA: number | string;
  nLot: string;
};

/* ── price recalculation ─────────────────────────────────────────────────── */

function recalculate(
  prev: Primary,
  changedKey: string,
  rawValue: string,
): Primary {
  const next: Primary = { ...prev };
  (next as any)[changedKey] = rawValue;

  const pp = num(next.purchasePrice);
  const spHT = num(next.sellingPriceHT);
  const spTTC = num(next.sellingPriceTTC);
  const pft = num(next.profit);
  const pftR = num(next.profitRate);
  const vat = num(next.vatRate);

  switch (changedKey) {
    case "purchasePrice": {
      if (spHT > 0) {
        // Keep HT, update profit based on new Purchase Price
        next.profit = round2(spHT - pp);
        next.profitRate = pp > 0 ? round2(((spHT - pp) / pp) * 100) : 0;
      } else if (pft > 0) {
        // Derive HT from PP + Profit
        next.sellingPriceHT = round2(pp + pft);
        next.profitRate = pp > 0 ? round2((pft / pp) * 100) : 0;
        next.sellingPriceTTC = round2(
          num(next.sellingPriceHT) * (1 + vat / 100),
        );
      }
      break;
    }

    case "sellingPriceHT": {
      const newHT = num(rawValue);
      // TTC always follows HT
      next.sellingPriceTTC = round2(newHT * (1 + vat / 100));
      // Profit is derived from HT - PP
      next.profit = round2(newHT - pp);
      next.profitRate = pp > 0 ? round2(((newHT - pp) / pp) * 100) : 0;
      break;
    }

    case "sellingPriceTTC": {
      const newTTC = num(rawValue);
      // Derive HT first
      const derivedHT = vat > 0 ? round2(newTTC / (1 + vat / 100)) : newTTC;
      next.sellingPriceHT = derivedHT;
      // Profit is derived from HT
      next.profit = round2(derivedHT - pp);
      next.profitRate = pp > 0 ? round2(((derivedHT - pp) / pp) * 100) : 0;
      break;
    }

    case "profit": {
      const newPft = num(rawValue);

      // If a Selling Price exists AND Purchase Price is NOT yet defined, calculate Purchase Price
      if ((spHT > 0 || spTTC > 0) && pp <= 0) {
        const targetHT =
          spHT > 0 ? spHT : vat > 0 ? round2(spTTC / (1 + vat / 100)) : spTTC;

        next.sellingPriceHT = targetHT;
        next.sellingPriceTTC =
          spTTC > 0 ? spTTC : round2(targetHT * (1 + vat / 100));
        next.purchasePrice = round2(targetHT - newPft);
        next.profitRate =
          num(next.purchasePrice) > 0
            ? round2((newPft / num(next.purchasePrice)) * 100)
            : 0;
      }
      // DEFAULT / FALLBACK: If PP exists (> 0) OR no selling price was provided, update Selling Price
      else if (pp >= 0) {
        next.sellingPriceHT = round2(pp + newPft);
        next.profitRate = pp > 0 ? round2((newPft / pp) * 100) : 0;
        next.sellingPriceTTC = round2(
          num(next.sellingPriceHT) * (1 + vat / 100),
        );
      }
      break;
    }

    case "profitRate": {
      const newPftR = num(rawValue);

      // If a Selling Price exists AND Purchase Price is NOT yet defined, calculate Purchase Price
      if ((spHT > 0 || spTTC > 0) && pp <= 0) {
        const targetHT =
          spHT > 0 ? spHT : vat > 0 ? round2(spTTC / (1 + vat / 100)) : spTTC;

        next.sellingPriceHT = targetHT;
        next.sellingPriceTTC =
          spTTC > 0 ? spTTC : round2(targetHT * (1 + vat / 100));

        const calculatedPP = round2(targetHT / (1 + newPftR / 100));
        next.purchasePrice = calculatedPP;
        next.profit = round2(targetHT - calculatedPP);
      }
      // DEFAULT / FALLBACK: If PP exists (> 0) OR no selling price was provided, update Selling Price
      else if (pp >= 0) {
        const calculatedPft = round2((newPftR / 100) * pp);
        next.profit = calculatedPft;
        next.sellingPriceHT = round2(pp + calculatedPft);
        next.sellingPriceTTC = round2(
          num(next.sellingPriceHT) * (1 + vat / 100),
        );
      }
      break;
    }

    case "vatRate": {
      next.sellingPriceTTC = round2(spHT * (1 + num(rawValue) / 100));
      break;
    }

    /* ── Discount Logic ────────────────────────────────────────── */

    case "discountRate": {
      const rate = num(rawValue);
      const baseTTC = num(next.sellingPriceTTC);
      const sub = round2((rate * baseTTC) / 100);
      next.discount = baseTTC - sub;
      break;
    }

    case "discount": {
      const discAmount = num(rawValue);
      const baseTTC = num(next.sellingPriceTTC);
      next.discountRate =
        baseTTC > 0 ? round2((discAmount * 100) / baseTTC) : 0;
      break;
    }

    default:
      break;
  }

  return next;
}
/* ── component ───────────────────────────────────────────────────────────── */

export function Step2Form({
  product_id,
  setModalOpen,
  isUpdate,
  variant_id,
  setSuccessToastMain,
}: {
  product_id: number | null;
  setModalOpen: (open: boolean) => void;
  isUpdate: boolean;
  variant_id?: number | null;
  setSuccessToastMain: (success: boolean) => void;
}) {
  const t = useTranslations();

  const [variantPrimary, setVariantPrimary] = useState<Primary>({
    name: "",
    barcode: "",
    purchasePrice: 0,
    sellingPriceHT: 0,
    profit: 0,
    profitRate: 0,
    vatRate: 0,
    sellingPriceTTC: 0,
    discount: 0,
    discountRate: 0,
    PPA: 0,
    nLot: "",
  });

  const [variantSecondary, setVariantSecondary] = useState({
    fabricationDate: null as string | null,
    expirationDate: null as string | null,
    quantity: 0,
    alertPeriodPerDay: 0,
    alertPeriodperStock: 0,
  });

  const [variantAttributes, setVariantAttributes] = useState({
    size: "",
    color: "",
    weight: "",
    height: "",
    flavor: "",
  });

  const [postVar, setPostVariant] = useState<PostVarinat>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const suppliersOption = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<number | undefined>(
    undefined,
  );
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [successToast, setSuccessToast] = useState(true);

  /* ── calculator ── */
  const [openCalculator, setOpenCalculator] = useState(false);
  const [calcValue, setCalcValue] = useState<string>("");
  const [activeField, setActiveField] = useState<string>("");

  useEffect(() => {
    if (!activeField || calcValue === "") return;
    setVariantPrimary((prev) => recalculate(prev, activeField, calcValue));
  }, [calcValue, activeField]);

  const getVariant = useCallback(async () => {
    const res = await getVaraiantById(variant_id!);
    console.log(res.response);

    if (res.status === 1) {
      setVariantPrimary({
        name: res.response.name,
        barcode: res.response.barcode,
        purchasePrice: res.response.purchasePrice,
        sellingPriceHT: res.response.sellingPriceHT,
        profit: res.response.profit,
        profitRate: res.response.profitRate,
        vatRate: res.response.vatRate ?? "0",
        sellingPriceTTC: res.response.sellingPriceTTC,
        discount: res.response.promotionPrice ?? "0",
        discountRate: res.response.promotionRate ?? "0",
        PPA: res.response.PPA ?? "0",
        nLot: res.response.nLot ?? "0",
      });
      setVariantAttributes({
        size: res.response.size,
        color: res.response.color,
        weight: res.response.weight,
        height: res.response.height,
        flavor: res.response.flavor,
      });
    }
  }, [isUpdate]);

  useEffect(() => {
    if (variant_id && isUpdate) {
      getVariant();
    }
  }, [variant_id, isUpdate]);

  /* ── field helpers ── */
  function handlePrimaryChange(key: string, rawValue: string) {
    setVariantPrimary((prev) => recalculate(prev, key, rawValue));
  }

  // Returns true if the field's current value is numeric (number OR a string that parses as one)
  // Used to decide whether clicking should open the calculator
  function isNumericField(value: number | string) {
    if (typeof value === "number") return true;
    return value !== "" && !isNaN(parseFloat(value as string));
  }

  function openCalc(key: string) {
    setActiveField(key);
    setCalcValue("");
    setOpenCalculator(true);
  }

  /* ── validation ── */
  function verifyForm() {
    const checks = [
      {
        condition: !variantPrimary.name,
        message: t("addProduct.toast.fieldsRequired.variantName"),
      },
      {
        condition: !variantPrimary.barcode,
        message: t("addProduct.toast.fieldsRequired.variantBarcode"),
      },
      {
        condition: !num(variantPrimary.purchasePrice),
        message: t("addProduct.toast.fieldsRequired.variantPurchasePrice"),
      },
      {
        condition: !num(variantPrimary.sellingPriceHT),
        message: t("addProduct.toast.fieldsRequired.variantSellingPriceHT"),
      },
    ];
    const failed = checks.find(({ condition }) => condition);
    if (failed) {
      toast.error(failed.message);
      return false;
    }
    return true;
  }

  function makeVariant() {
    if (!isUpdate) {
      if (!verifyForm()) return;
    }
    const newVariant: PostVarinat = {
      ...postVar,
      productId: product_id || 0,
      name: variantPrimary.name,
      barcode: variantPrimary.barcode,
      purchasePrice: parseFloat(variantPrimary.purchasePrice.toString()),
      sellingPriceHT: parseFloat(variantPrimary.sellingPriceHT.toString()),
      sellingPriceTTC: parseFloat(variantPrimary.sellingPriceTTC.toString()),
      profit: parseFloat(variantPrimary.profit.toString()),
      profitRate: parseFloat(variantPrimary.profitRate.toString()),
      promotionPrice: parseFloat(variantPrimary.discount.toString()),
      promotionRate: parseFloat(variantPrimary.discountRate.toString()),
      vatRate: parseFloat(variantPrimary.vatRate.toString()),
      PPA: parseFloat(variantPrimary.PPA.toString()),
      fabricationDate: formatDateToISO(variantSecondary.fabricationDate),
      expirationDate: formatDateToISO(variantSecondary.expirationDate),
      quantity: parseInt(variantSecondary.quantity.toString()),
      alertPeriodPerDay: parseInt(
        variantSecondary.alertPeriodPerDay.toString(),
      ),
      alertPeriodPerStock: parseInt(
        variantSecondary.alertPeriodperStock.toString(),
      ),
      size: variantAttributes.size,
      color: variantAttributes.color,
      weight: variantAttributes.weight
        ? variantAttributes.weight.toString()
        : undefined,
      height: variantAttributes.height
        ? variantAttributes.height.toString()
        : undefined,
      flavor: variantAttributes.flavor,
      nLot: variantPrimary.nLot,
      supplierId: selectedSupplier,
    };

    setPostVariant(newVariant);
    if (!isUpdate) {
      createVariant(newVariant);
    } else {
      updateVraiant(variant_id ?? 0, newVariant);
    }
  }

  async function createVariant(variant: PostVarinat) {
    const response = await postVariant(variant);
    if (response.status === 1) {
      toast.success(t("addProduct.toast.variantCreated"));
      setSuccessToastMain(true);
      setModalOpen(false);
    } else {
      toast.error(response.response ?? t("addProduct.toast.unknownError"));
    }
  }

  const fetchSuppliers = useCallback(async () => {
    const res = await getAllSuppliers(1, 0, search);
    setSuppliers(res.response.data);
    setSuccessToast(false);
  }, [search]);

  useEffect(() => {
    if (successToast) fetchSuppliers();
  }, [search, successToast]);

  /* ── shared input renderer ── */
  // Drop-in replacement for the numInput function in Step2Form

  function numInput(
    key: keyof Primary,
    value: number | string,
    colSpan?: boolean,
  ) {
    return (
      <div key={key} className={colSpan ? styles.fieldFull : styles.field}>
        <label className={styles.label}>{t(`addProduct.step2.${key}`)}</label>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          // Allow direct keyboard typing via handlePrimaryChange
          onChange={(e) => handlePrimaryChange(key, e.target.value)}
          // Also open the calculator on click for convenience
          onClick={() => openCalc(key)}
          className={styles.input}
          // ← readOnly removed: user can now type freely with the keyboard
          style={key === "sellingPriceTTC" ? { gridColumn: "span 3" } : {}}
        />
      </div>
    );
  }

  function textInput(key: keyof Primary, value: string) {
    const [field, setField] = useState(value);
    async function generateBareCode() {
      const code = await getNewbarCode();
      if (code.status === 1) {
        setField(code.response);
        handlePrimaryChange(key, code.response.toString());
      } else {
        toast.error(code.response ?? t("addProduct.toast.unknownError"));
      }
    }

    return (
      <div key={key} className={styles.fieldFull}>
        <label className={styles.label}>{t(`addProduct.step2.${key}`)}</label>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <input
            type="text"
            value={value ?? " "}
            onChange={(e) => {
              handlePrimaryChange(key, e.target.value);
            }}
            placeholder={t(`addProduct.step2.${key}Placeholder`)}
            className={styles.input}
          />
          {key === "barcode" && (
            <div
              onClick={() => generateBareCode()}
              style={{
                cursor: "pointer",
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Barcode /> auto
            </div>
          )}
        </div>
      </div>
    );
  }

  async function updateVraiant(
    variantId: number,
    variant: PostVarinat,
  ): Promise<void> {
    const res = await putVariant(variantId, variant);
    if (res.status === 1) {
      toast.success(t("addProduct.toast.variantUpdated"));
      setSuccessToastMain(true);
      setModalOpen(false);
    } else {
      toast.error(res.response ?? t("addProduct.toast.unknownError"));
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {!isUpdate && (
          <div className={styles.steps}>
            <div className={styles.stepDot} />
            <div className={`${styles.stepDot} ${styles.active}`} />
          </div>
        )}
        <h2 className={styles.title}>
          {isUpdate
            ? t("addProduct.step2.updateTitle")
            : t("addProduct.step2.title")}
        </h2>
        <p className={styles.subtitle}>
          {isUpdate
            ? t("addProduct.step2.updateSubtitle")
            : t("addProduct.step2.subtitle")}
        </p>
      </div>

      <div className={styles.formBody}>
        {/* ── Identity ─────────────────────────────────────────── */}
        <div className={styles.sectionLabel}>
          {t("addProduct.step2.primaryLabel")}
        </div>
        <div className={styles.grid2}>
          {textInput("name", variantPrimary.name as string)}
          {textInput("barcode", variantPrimary.barcode as string)}
        </div>

        {/* ── Pricing ──────────────────────────────────────────── */}
        <div className={styles.sectionLabel}>
          {t("addProduct.step2.pricingLabel")}
        </div>
        <div className={styles.grid3}>
          {!isUpdate &&
            textInput("nLot", variantPrimary.nLot?.toString() || "")}
          {numInput("purchasePrice", variantPrimary.purchasePrice)}
          {numInput("sellingPriceHT", variantPrimary.sellingPriceHT)}
          {numInput("PPA", variantPrimary.PPA)}
          {numInput("profit", variantPrimary.profit)}
          {numInput("profitRate", variantPrimary.profitRate)}
          {numInput("vatRate", variantPrimary.vatRate)}
          {numInput("sellingPriceTTC", variantPrimary.sellingPriceTTC)}
        </div>

        {/* ── Discount ─────────────────────────────────────────── */}
        <div className={styles.sectionLabel}>
          {t("addProduct.step2.discountLabel")}
        </div>
        <div className={styles.grid2}>
          {numInput("discount", variantPrimary.discount)}
          {numInput("discountRate", variantPrimary.discountRate)}
        </div>

        {/* ── Stock & Dates ─────────────────────────────────────── */}
        {!isUpdate && (
          <>
            <div className={styles.sectionLabel}>
              {t("addProduct.step2.secondaryLabel")}
            </div>
            <div className={styles.grid4}>
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("addProduct.step2.quantity")}
                </label>
                <input
                  type="number"
                  value={variantSecondary.quantity}
                  onChange={(e) =>
                    setVariantSecondary((p) => ({
                      ...p,
                      quantity: +e.target.value,
                    }))
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("addProduct.step2.alertPeriodPerDay")}
                </label>
                <input
                  type="number"
                  value={variantSecondary.alertPeriodPerDay}
                  onChange={(e) =>
                    setVariantSecondary((p) => ({
                      ...p,
                      alertPeriodPerDay: +e.target.value,
                    }))
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("addProduct.step2.alertPeriodPerStock")}
                </label>
                <input
                  type="number"
                  value={variantSecondary.alertPeriodperStock}
                  onChange={(e) =>
                    setVariantSecondary((p) => ({
                      ...p,
                      alertPeriodperStock: +e.target.value,
                    }))
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("addProduct.step2.fabricationDate")}
                </label>
                <input
                  type="date"
                  value={variantSecondary.fabricationDate ?? ""}
                  onChange={(e) =>
                    setVariantSecondary((p) => ({
                      ...p,
                      fabricationDate: e.target.value,
                    }))
                  }
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("addProduct.step2.expirationDate")}
                </label>
                <input
                  type="date"
                  value={variantSecondary.expirationDate ?? ""}
                  onChange={(e) =>
                    setVariantSecondary((p) => ({
                      ...p,
                      expirationDate: e.target.value,
                    }))
                  }
                  className={styles.dateInput}
                />
              </div>
            </div>
            <div className={styles.sectionLabel}>
              {t("addProduct.step2.supplier")}
            </div>
            <div className={styles.suppliersSection}>
              <Select
                styles={selectStyles}
                onInputChange={(val) => setSearch(val)}
                options={suppliersOption}
                onChange={(opt) => (
                  setSelectedSupplier(opt?.value ?? undefined),
                  setPostVariant({
                    ...postVar,
                    supplierId: opt?.value || undefined,
                  } as PostVarinat)
                )}
                value={
                  suppliers.find((s) => s.id === selectedSupplier)
                    ? {
                        value: selectedSupplier,
                        label: suppliers.find((s) => s.id === selectedSupplier)
                          ?.name,
                      }
                    : null
                }
                placeholder={t("addProduct.step2.supplierPlaceholder")}
              />
              <Plus
                className={styles.addSupplierButton}
                onClick={() => setShowAddSupplierModal(true)}
              />
              <Trash2
                className={styles.addSupplierButton}
                onClick={() => {
                  setSelectedSupplier(undefined);
                  setPostVariant({
                    ...postVar,
                    supplierId: undefined,
                  } as PostVarinat);
                }}
              />
            </div>
          </>
        )}
        <div className={styles.sectionLabel}>
          {t("addProduct.step2.attributes")}
        </div>
        <div className={styles.grid3}>
          {(["size", "color", "flavor"] as const).map((key) => (
            <div key={key} className={styles.field}>
              <label className={styles.label}>
                {t(`addProduct.step2.${key}`)}
              </label>
              <input
                type="text"
                value={variantAttributes[key]}
                onChange={(e) =>
                  setVariantAttributes((p) => ({
                    ...p,
                    [key]: e.target.value,
                  }))
                }
                placeholder={t(`addProduct.step2.${key}Placeholder`)}
                className={styles.input}
              />
            </div>
          ))}
          {(["weight", "height"] as const).map((key) => (
            <div key={key} className={styles.field}>
              <label className={styles.label}>
                {t(`addProduct.step2.${key}`)}
              </label>
              <input
                type="text"
                value={variantAttributes[key]}
                onChange={(e) =>
                  setVariantAttributes((p) => ({
                    ...p,
                    [key]: e.target.value,
                  }))
                }
                className={styles.input}
              />
            </div>
          ))}
        </div>
      </div>
      {/* ── Footer ── */}
      <div className={styles.footer}>
        <button
          className={styles.btnSecondary}
          onClick={() => setModalOpen(false)}
        >
          {t("addProduct.actions.close")}
        </button>
        <button className={styles.btnPrimary} onClick={makeVariant}>
          {t(`addProduct.actions.${isUpdate ? "update" : "createProduct"}`)}
        </button>
      </div>

      {showAddSupplierModal && (
        <AddSupllierModal
          isUpdate={false}
          setModalOpen={setShowAddSupplierModal}
          setSuccessToast={setSuccessToast}
        />
      )}

      <ToastContainer />

      {openCalculator && (
        <CalculatorModal
          setOpenCalculator={setOpenCalculator}
          setValue={(val: number) => setCalcValue(val.toString())}
        />
      )}
    </div>
  );
}
