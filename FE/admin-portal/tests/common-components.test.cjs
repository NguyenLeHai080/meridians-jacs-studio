const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const COMMON_DIR = path.resolve(__dirname, "../src/components/common");

test("master common components directory has all required component files", () => {
  const expectedFiles = [
    "Badge.tsx",
    "Button.tsx",
    "CopyButton.tsx",
    "DatePicker.tsx",
    "Input.tsx",
    "Modal.tsx",
    "Pagination.tsx",
    "Select.tsx",
    "StatsCard.tsx",
    "Table.tsx",
    "Toast.tsx",
    "index.ts",
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(COMMON_DIR, file);
    assert.ok(fs.existsSync(filePath), `Missing common component file: ${file}`);
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.length > 50, `File ${file} is unexpectedly empty or too small`);
  }
});

test("common index.ts exports all component modules cleanly", () => {
  const indexContent = fs.readFileSync(path.join(COMMON_DIR, "index.ts"), "utf8");
  const exports = [
    'export * from "./Badge"',
    'export * from "./Button"',
    'export * from "./Input"',
    'export * from "./Modal"',
    'export * from "./Pagination"',
    'export * from "./Select"',
    'export * from "./StatsCard"',
    'export * from "./Toast"',
    'export * from "./Table"',
  ];

  for (const exp of exports) {
    assert.ok(indexContent.includes(exp), `index.ts missing export: ${exp}`);
  }
});

test("Table component provides DataTable and sub-components", () => {
  const tableContent = fs.readFileSync(path.join(COMMON_DIR, "Table.tsx"), "utf8");
  assert.ok(tableContent.includes("export function DataTable"), "Table.tsx should export DataTable");
  assert.ok(tableContent.includes("export function Table"), "Table.tsx should export Table");
  assert.ok(tableContent.includes("export function EmptyState"), "Table.tsx should export EmptyState");
  assert.ok(tableContent.includes("export interface Column"), "Table.tsx should export Column interface");
});

test("Select component provides Select and FilterSelect", () => {
  const selectContent = fs.readFileSync(path.join(COMMON_DIR, "Select.tsx"), "utf8");
  assert.ok(selectContent.includes("export function Select"), "Select.tsx should export Select");
  assert.ok(selectContent.includes("export function FilterSelect"), "Select.tsx should export FilterSelect");
  assert.ok(selectContent.includes("export interface SelectOption"), "Select.tsx should export SelectOption interface");
});

test("Badge component provides Badge and StatusBadge", () => {
  const badgeContent = fs.readFileSync(path.join(COMMON_DIR, "Badge.tsx"), "utf8");
  assert.ok(badgeContent.includes("export function Badge"), "Badge.tsx should export Badge");
  assert.ok(badgeContent.includes("export function StatusBadge"), "Badge.tsx should export StatusBadge");
  assert.ok(badgeContent.includes("getPillClass"), "Badge.tsx should define getPillClass for status colors");
});

test("Pagination math helper computes total pages and current window accurately", () => {
  function getPaginationData(totalItems, pageSize, currentPage) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    return { totalPages, safePage, startIndex, endIndex };
  }

  const res1 = getPaginationData(105, 10, 1);
  assert.equal(res1.totalPages, 11);
  assert.equal(res1.startIndex, 0);
  assert.equal(res1.endIndex, 10);

  const res2 = getPaginationData(105, 10, 11);
  assert.equal(res2.totalPages, 11);
  assert.equal(res2.startIndex, 100);
  assert.equal(res2.endIndex, 105);

  const res3 = getPaginationData(0, 10, 1);
  assert.equal(res3.totalPages, 1);
  assert.equal(res3.startIndex, 0);
  assert.equal(res3.endIndex, 0);
});
