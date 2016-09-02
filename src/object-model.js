Model[OBJECT] = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model[DEFINITION]);
		model[VALIDATE](proxy);
		return proxy;
	};

	setConstructorProto(model, O[PROTO]);
	initModel(model, def, Model[OBJECT]);
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
	checkAssertions(obj, this);
});

function getProxy(model, obj, defNode, path) {
	if(defNode instanceof Model && obj && !(obj instanceof defNode)) {
		return defNode(obj);
	} else if(isArray(defNode)){
		var suitableModels = [];
		for(var i=0, l=defNode.length; i<l; i++){
			var part = defNode[i];
			if(part instanceof Model){
				if(obj instanceof part){
					return obj;
				}
				if(part.test(obj)){
					suitableModels.push(part);
				}
			}
		}
		if(suitableModels.length === 1){
			return suitableModels[0](obj); // automatically cast to the suitable model when explicit
		} else if(suitableModels.length > 1){
			console.warn("Ambiguous model for value "+toString(obj)+", could be "+suitableModels.join(" or "));
		}
		return obj;
	} else if(isLeaf(defNode)){
		return obj;
	} else {
		var wrapper = obj instanceof O ? obj : {};
		var proxy = O.create(O.getPrototypeOf(wrapper));

		for(var key in wrapper){
			if(wrapper.hasOwnProperty(key) && !(key in defNode)){
				proxy[key] = wrapper[key]; // properties out of model definition are kept
			}
		}

		O.keys(defNode).forEach(function(key) {
			var newPath = (path ? path + '.' + key : key);
			var isConstant = Model[CONVENTION_CONSTANT](key);
			defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(isConstant && wrapper[key] !== undefined){
						var err = {};
						err[MESSAGE] = "cannot redefine constant " + key;
						model[ERROR_STACK].push(err);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkDefinition(newProxy, defNode[key], newPath, [], model[ERROR_STACK]);
					var oldValue = wrapper[key];
					wrapper[key] = newProxy;
					checkAssertions(obj, model);
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
}