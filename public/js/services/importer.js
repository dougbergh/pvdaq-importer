angular.module('importerService', [])

    // each function returns a promise object 
    .factory('Importer', ['$http',function($http) {
	return {
	    get : function() {
		return $http.get('/api/import');
	    },
	    import : function(source,data) {
		return $http.post('/api/import/'+source, data);
	    }
	}
    }]);