function isFunction(o){
	return typeof o === "function";
}

var isArray = Array.isArray || function(a){
	return a instanceof Array
};

function toString(obj, ndeep){
	if(ndeep === undefined){ ndeep = 1; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(typeof obj == "function"){ return obj.name || obj.toString(ndeep); }
	if(isArray(obj)){
		return '[' + obj.map(function(item) {
				return toString(item, ndeep);
			}).join(', ') + ']';
	}
	if(obj && typeof obj == "object"){
		var indent = (new Array(ndeep)).join('\t');
		return '{' + Object.keys(obj).map(function(key){
				return '\n\t' + indent + key + ': ' + toString(obj[key], ndeep+1);
			}).join(',') + '\n' + indent + '}';
	}
	return String(obj)
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1];
}

function cloneArray(arr){
	return Array.prototype.slice.call(arr);
}

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

function merge(base, ext, replace){
	if(ext instanceof Object){
		for(var p in ext){
			if(ext.hasOwnProperty(p)){
				if(base.hasOwnProperty(p)){
					if(base[p] instanceof Object){
						merge(base[p], ext[p], replace);
					} else if(replace){
						base[p] = ext[p];
					}
				} else {
					base[p] = ext[p];
				}
			}
		}
	}
	return base
}

Number.isInteger = Number.isInteger || function(value) {
	return typeof value === "number" &&
		isFinite(value) &&
		Math.floor(value) === value;
};

Object.setPrototypeOf = Object.setPrototypeOf || ({__proto__:[]} instanceof Array
	? function(o, p){ o.__proto__ = p; }
	: function(o, p){ for(var k in p){ o[k] = p[k]; } });