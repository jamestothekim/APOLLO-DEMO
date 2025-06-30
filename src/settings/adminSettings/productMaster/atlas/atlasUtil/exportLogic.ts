/*
Utility for generating a sample extract using in-memory data that was
previously fetched by StagingDialog. No extra API calls are performed.
*/

import { syncMaster } from "../atlas";

export interface MarketRow {
  [key: string]: any;
  customers?: any; // JSON array (string or object[])
}
export interface SkuRow {
  [key: string]: any;
}

/**
 * Return text content for a delimited file representing the selected fields
 * for every valid combination of Market ⇢ (Customer?) ⇢ (SKU?).
 */
export function generateSampleFile(
  config: syncMaster,
  marketRows: MarketRow[],
  skuRows: SkuRow[]
): string {
  const delimiter = config.delimiter || ",";
  const selected = config.selectedFields;
  const headers = selected.map((f) => config.headerMap[f] || f);

  // Helpers -------------------------------------------------------------
  const includesField = (obj: any, field: string) =>
    obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, field);

  const firstMarket = marketRows[0] || {};
  const firstCustomer = Array.isArray(firstMarket.customers)
    ? firstMarket.customers?.[0]
    : typeof firstMarket.customers === "string"
    ? JSON.parse(firstMarket.customers || "[]")[0]
    : undefined;
 

  // Decide granular loops
  let usesCustomer = false;
  let usesSku = false;

  selected.forEach((field) => {
    if (includesField(firstMarket, field)) return;
    if (firstCustomer && includesField(firstCustomer, field)) {
      usesCustomer = true;
      return;
    }
    usesSku = true; // default to SKU-level if not found above
  });

  const lines: string[] = [];

  marketRows.forEach((mkt) => {
    // normalise customers to object[]
    let custArray: any[] = [];
    if (usesCustomer) {
      if (Array.isArray(mkt.customers)) {
        custArray = mkt.customers;
      } else if (typeof mkt.customers === "string") {
        try {
          custArray = JSON.parse(mkt.customers);
        } catch {
          custArray = [];
        }
      }
      if (!custArray.length) custArray = [{}];
    } else {
      custArray = [null];
    }

    const skuLoop = usesSku ? skuRows : [{}];

    custArray.forEach((cust) => {
      skuLoop.forEach((sku) => {
        const row = selected.map((field) => {
          if (includesField(mkt, field)) return mkt[field];
          if (cust && includesField(cust, field)) return cust[field];
          if (includesField(sku, field)) return sku[field];
          return "";
        });
        lines.push(row.join(delimiter));
      });
    });
  });

  return [headers.join(delimiter), ...lines].join("\n");
}
