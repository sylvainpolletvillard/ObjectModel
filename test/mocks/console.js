const consoleMock = {
	methods: ["debug","log","warn","error"],
	apply: function(){
		consoleMock.methods.forEach(function(method){
			consoleMock["_default"+method] = console[method];
			consoleMock[method+"LastArgs"] = [];
			console[method] = function(){
				consoleMock[method+"LastArgs"] = arguments;
			}
		})
	},
	revert: function(){
		consoleMock.methods.forEach(function(method){
			console[method] = consoleMock["_default"+method];
			consoleMock[method+"LastArgs"] = [];
		});
	}
};

export default consoleMock;