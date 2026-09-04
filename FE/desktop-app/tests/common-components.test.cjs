const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const COMMON_DIR = path.resolve(__dirname, "../src/components/common");
const LAYOUT_DIR = path.resolve(__dirname, "../src/components/layout");

test("desktop app master common components directory has all required component files", () => {
  const expectedFiles = [
    "Badge.tsx",
    "Button.tsx",
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

test("desktop app layout components directory has Sidebar, Navbar, Banners", () => {
  const expectedLayoutFiles = ["Sidebar.tsx", "Navbar.tsx", "Banners.tsx", "index.ts"];
  for (const file of expectedLayoutFiles) {
    const filePath = path.join(LAYOUT_DIR, file);
    assert.ok(fs.existsSync(filePath), `Missing layout component file: ${file}`);
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.length > 50, `File ${file} is unexpectedly empty or too small`);
  }
});

test("desktop common Table component exports DataTable, Table, EmptyState", () => {
  const tableContent = fs.readFileSync(path.join(COMMON_DIR, "Table.tsx"), "utf8");
  assert.ok(tableContent.includes("DataTable"), "Table.tsx should export DataTable");
  assert.ok(tableContent.includes("Table: React.FC") || tableContent.includes("function Table"), "Table.tsx should export Table");
  assert.ok(tableContent.includes("EmptyState"), "Table.tsx should export EmptyState");
});

test("desktop common Select component exports Select and FilterSelect", () => {
  const selectContent = fs.readFileSync(path.join(COMMON_DIR, "Select.tsx"), "utf8");
  assert.ok(selectContent.includes("Select: React.FC") || selectContent.includes("function Select"), "Select.tsx should export Select");
  assert.ok(selectContent.includes("FilterSelect"), "Select.tsx should export FilterSelect");
});

test("desktop common Badge component exports Badge and StatusBadge", () => {
  const badgeContent = fs.readFileSync(path.join(COMMON_DIR, "Badge.tsx"), "utf8");
  assert.ok(badgeContent.includes("Badge: React.FC") || badgeContent.includes("function Badge"), "Badge.tsx should export Badge");
  assert.ok(badgeContent.includes("StatusBadge"), "Badge.tsx should export StatusBadge");
});
