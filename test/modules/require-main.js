require.config({
	paths: {
		"Model": "../../dist/object-model.umd"
	}
});

require(["Model"], function(Model){
	testSuite(Model);
});