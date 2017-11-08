Object.assign(global, require("../dist/object-model.js"));

require("./model.spec")
require("./basic-model.spec")
require("./object-model.spec")
require("./array-model.spec")
require("./function-model.spec")
require("./map-model.spec")
require("./set-model.spec")