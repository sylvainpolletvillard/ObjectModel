QUnit.test("loading module", async t => {
  const globals = await import("../dist/object-model.min.js")
  Object.assign(globalThis, globals)
  t.ok("Model" in globals, "libarary correcty loaded as module");
});

require("./model.spec.cjs")
require("./basic-model.spec.cjs")
require("./any-model.spec.cjs")
require("./object-model.spec.cjs")
require("./array-model.spec.cjs")
require("./function-model.spec.cjs")
require("./map-model.spec.cjs")
require("./set-model.spec.cjs")