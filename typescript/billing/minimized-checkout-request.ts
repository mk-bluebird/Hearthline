// SPDX-License-Identifier: MIT OR Apache-2.0

export type ApprovedProduct = Readonly<{
  productRef: string;
  billingLabel: string;
  amountMinor: number;
  currency: string;
}>;

export type CheckoutRequest = Readonly<{
  productRef: string;
  transactionRef: string;
}>;

export type ProcessorProjection = Readonly<{
  transactionRef: string;
  productRef: string;
  description: string;
  amountMinor: number;
  currency: string;
}>;

export function projectCheckout(
  request: CheckoutRequest,
  approvedProducts: ReadonlyMap<string, ApprovedProduct>,
): ProcessorProjection {
  if (
    typeof request.productRef !== "string" ||
    !request.productRef.trim() ||
    typeof request.transactionRef !== "string" ||
    !request.transactionRef.trim()
  ) {
    throw new TypeError("Invalid checkout references");
  }

  const product = approvedProducts.get(request.productRef);
  if (!product || product.productRef !== request.productRef) {
    throw new Error("Product is not approved for checkout");
  }

  if (
    typeof product.billingLabel !== "string" ||
    !product.billingLabel.trim() ||
    !Number.isSafeInteger(product.amountMinor) ||
    product.amountMinor <= 0 ||
    typeof product.currency !== "string" ||
    !/^[A-Z]{3}$/.test(product.currency)
  ) {
    throw new TypeError("Invalid approved product");
  }

  return Object.freeze({
    transactionRef: request.transactionRef,
    productRef: product.productRef,
    description: product.billingLabel,
    amountMinor: product.amountMinor,
    currency: product.currency,
  });
}
