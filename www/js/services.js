angular.module('alltoez.services', ['ngResource'])
.constant("baseApiUrl", "http://localhost:8000/api/v1/")
.factory('Events', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'events/:id?format=json',
    {id: "@id"}, { 'getEvents': {method: 'GET', isArray: false},}
  );
});
