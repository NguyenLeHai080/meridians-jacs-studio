const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const typescript = require("../node_modules/typescript");

function load(relativePath) {
  const sourcePath = path.resolve(__dirname, "..", relativePath);
  const output = typescript.transpileModule(fs.readFileSync(sourcePath, "utf8"), { compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS }, fileName: sourcePath }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function (require, module, exports) { ${output}\n })(require, module, module.exports);`, { require, module, console }, { filename: sourcePath });
  return module.exports;
}

const { trimTimelineClip, splitTimelineClip, createTimelineHistory } = load("src/core/timeline.ts");

test("trims a timeline clip and keeps ordering", () => {
  const result = trimTimelineClip([{ sceneId: "scene-1", order: 0 }], "scene-1", 2, 8);
  assert.deepEqual(JSON.parse(JSON.stringify(result[0])), { sceneId: "scene-1", order: 0, trimIn: 2, trimOut: 8 });
});

test("splits a bounded clip into two persisted timeline clips", () => {
  const result = splitTimelineClip([{ sceneId: "scene-1", order: 0, trimIn: 0, trimOut: 10 }], "scene-1", 4);
  assert.equal(result.length, 2);
  assert.equal(result[0].trimOut, 4);
  assert.equal(result[1].trimIn, 4);
  assert.equal(result[1].sceneId, "scene-1-part-2");
});

test("timeline history supports undo and redo", () => {
  const history = createTimelineHistory([{ sceneId: "scene-1", order: 0 }]);
  history.commit([{ sceneId: "scene-2", order: 0 }]);
  assert.equal(history.canUndo, true);
  assert.equal(history.undo()[0].sceneId, "scene-1");
  assert.equal(history.redo()[0].sceneId, "scene-2");
});
