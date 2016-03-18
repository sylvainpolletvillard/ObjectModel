Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		if(obj != null && !isObject(obj)){
			model.errorStack.push({ expected: model, result: obj });
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model.definition);
		ensureProto(proxy, model.prototype);
		model.validate(proxy);
		model.unstack();
		return proxy;
	};

	setConstructor(model, Model.Object);
	model.definition = def;
	model.assertions = [];
	model.errorStack = [];
	return model;
};

setProto(Model.Object, Model.prototype, Model);

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

Model.Object.prototype.toString = function(stack){
	return toString(this.definition, stack);
};

function getProxy(model, obj, defNode, path) {
	if(Model.instanceOf(defNode, Model) && !Model.instanceOf(obj, defNode)) {
		return defNode(obj);
	} else if(isLeaf(defNode)){
		return obj;
	}
	else {
		var wrapper = obj instanceof Object ? obj : {};
		var proxy = Object.create(Object.getPrototypeOf(wrapper));

		for(var key in wrapper){
			if(wrapper.hasOwnProperty(key) && !(key in defNode)){
				proxy[key] = wrapper[key]; // properties out of model definition are kept
			}
		}

		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? path + '.' + key : key);
			var isConstant = Model.conventionForConstant(key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(isConstant && wrapper[key] !== undefined){
						model.errorStack.push({ message: "cannot redefine constant " + key });
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkDefinition(newProxy, defNode[key], newPath, [], model.errorStack);
					var oldValue = wrapper[key];
					wrapper[key] = newProxy;
					matchAssertions(obj, model.assertions, model.errorStack);
					if(model.errorStack.length){
						wrapper[key] = oldValue;
						model.unstack();
					}
				},
				enumerable: !Model.conventionForPrivate(key)
			});
		});
		return proxy;
	}
}