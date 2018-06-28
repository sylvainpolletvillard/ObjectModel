Model[OBJECT] = function ObjectModel(def){

	var model = function(obj) {
		if(is(model, obj)){
			return obj;
		}
		if(!is(model, this)){
			return new model(obj);
		}

		if(!is(Object, obj) && obj !== undefined){
			var err = {};
			err[EXPECTED] = OBJECT;
			err[RECEIVED] = obj;
			model[ERROR_STACK].push(err);
		}

		obj = defaultTo(model[DEFAULT], obj);
		merge(this, model[CONSTRUCTOR_PRIVATE](obj), true);
		var proxy = getProxy(model, this, model[DEFINITION]);
		model[VALIDATE](proxy);
		return proxy;
	};

	setConstructorProto(model, Object[PROTO]);
	initModel(model, arguments, Model[OBJECT]);
	return model;
};

setConstructorProto(Model[OBJECT], ModelProto);
var ObjectModelProto = Model[OBJECT][PROTO];

ObjectModelProto[DEFAULTS] = function(p){
	merge(this[PROTO], p);
	return this;
};

ObjectModelProto.toString = function(stack){
	return toString(this[DEFINITION], stack);
};

// private methods
define(ObjectModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	if(!isObject(obj)){
		var err = {};
		err[EXPECTED] = this;
		err[RECEIVED] = obj;
		err[PATH] = path;
		errorStack.push(err);
	} else {
		checkDefinition(obj, this[DEFINITION], path, callStack, errorStack);
	}
	checkAssertions(obj, this, path, errorStack);
});

define(ObjectModelProto, CONSTRUCTOR_PRIVATE, function(o){ return o });

function getProxy(model, obj, defNode, path) {
	if(!isPlainObject(defNode)) {
		return cast(obj, defNode);
	}

	var wrapper = is(Object, obj) ? obj : {};
	var proxy = Object.create(getProto(wrapper));

	for(var key in wrapper){
		if(has(wrapper, key) && !(key in defNode)){
			proxy[key] = wrapper[key]; // properties out of model definition are kept
		}
	}

	Object.keys(defNode).forEach(function(key) {
		var newPath = (path ? path + '.' + key : key);
		var isConstant = Model[CONVENTION_CONSTANT](key);
		var defPart = defNode[key];

		if(!isPlainObject(defPart) && wrapper[key] && !is(Model, wrapper[key][CONSTRUCTOR])) {
			// cast nested models immediately at parent instanciation
			wrapper[key] = cast(wrapper[key], defPart);
		}

		defineProperty(proxy, key, {
			get: function () {
				return getProxy(model, wrapper[key], defPart, newPath);
			},
			set: function (val) {
				if(isConstant && wrapper[key] !== undefined){
					var err = {};
					err[MESSAGE] = "cannot redefine constant " + key;
					model[ERROR_STACK].push(err);
				}
				var newProxy = getProxy(model, val, defPart, newPath);
				checkDefinition(newProxy, defPart, newPath, [], model[ERROR_STACK]);
				var oldValue = wrapper[key];
				wrapper[key] = newProxy;
				checkAssertions(obj, model, newPath, model[ERROR_STACK]);
				if(model[ERROR_STACK].length){
					wrapper[key] = oldValue;
					model[UNSTACK]();
				}
			},
			enumerable: !Model[CONVENTION_PRIVATE](key)
		});
	});
	return proxy;
}