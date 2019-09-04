import { ObjectModel } from "objectmodel";

const Config = new ObjectModel({
	local: {
		time: {
			format: ["12h", "24h", undefined]
		}
	}
});

const config = { local: undefined };
const new_config = Config(config); // object model

let hour;

if (config.local.time.format === "12h") {
	hour %= 12;
}
//TypeError: Cannot read property 'time' of undefined

// so to prevent this exception, we have to check this way:
if (
	config != null &&
  config.local != null &&
  config.local.time != null &&
  config.local.time.format === "12h"
) {
	hour %= 12;
}

// with object models, no worries :)
if (new_config.local.time.format === "12h") {
	hour %= 12;
}
// new_config.local.time.format returns undefined

console.log(hour);
