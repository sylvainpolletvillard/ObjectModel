function isFunction(o){
	return typeof o === "function";
}
function isObject(o){
    return typeof o === "object";
}

var isArray = Array.isArray || function(a){
	return a instanceof Array
};

function toString(obj, ndeep){
	if(ndeep === undefined){ ndeep = 0; }
	if(ndeep > 15){ return '...'; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(isFunction(obj)){ return obj.name || obj.toString(ndeep); }
	if(isArray(obj)){
		return '[' + obj.map(function(item) {
				return toString(item, ndeep);
			}).join(', ') + ']';
	}
	if(obj && isObject(obj)){
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

var canSetProto = !!Object.setPrototypeOf || {__proto__:[]} instanceof Array;
Object.setPrototypeOf = Object.setPrototypeOf || (canSetProto
    ? function(o, p){ o.__proto__ = p; }
    : function(o, p){ for(var k in p){ o[k] = p[k]; } });

Object.getPrototypeOf = Object.getPrototypeOf || (canSetProto
    ? function(o){ return typeof o.__proto__  === "object" ? o.__proto__ : null; }
    : function(o){ // may break if the constructor has been tampered with
        return isObject(o) && o.constructor && o.constructor.prototype ? o.constructor.prototype : null;
    });

function instanceofsham(obj, Constructor){
    return canSetProto
        ? obj instanceof Constructor
        : (function recursive(o){
            if(o == null || !isObject(o)) return false;
            var proto = Object.getPrototypeOf(o);
            return proto === Constructor.prototype || (proto !== o && recursive(proto));
        })(obj)
}

