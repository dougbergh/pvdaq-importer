angular.module('importerController', [])

    // inject all service factories into our controller
    .controller('mainController', ['$scope','$http','Importer', 
				   function($scope, $http, Importer ) {

        $scope.formData = {};
	$scope.loading = true;

	// GET =====================================================================
	// Render the input page
	Importer.get()
	    .success(function(data) {
		    $scope.status = data;
		    $scope.loading = false;
		});

	// IMPORT ==================================================================
	// User pressed 'Import' button
	// Call the back end to execute the import
	$scope.importSystems = function() {

	    // Validate the formData
	    if ($scope.formData.source == undefined)
		alert( "select PVDAQ or PVOutput" );

	    else {

		$scope.loading = true;
		
		// call the importer API to kick off the import
		Importer.import($scope.formData.source,$scope.formData)
		    .success(function(data) {
			
			    $scope.status = data;
			    $scope.loading = false;
			    $scope.formData = {}; // clear the form so our user is ready to enter another
			});
	    }
	}
			  
	// DELETE ==================================================================
	// delete a testrun after checking it
	$scope.deleteTestrun = function(id) {
	    $scope.loading = true;
	    
	    Testruns.delete(id)
	    // if successful creation, call our get function to get all the new testruns
	    .success(function(data) {
		    $scope.loading = false;
		    $scope.testruns = data; // assign our new list of testruns
		});
	};
}]);