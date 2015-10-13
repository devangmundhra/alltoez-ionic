angular.module('alltoez.services', ['ngResource'])
.constant("baseApiUrl", AppSettings.baseApiUrl)
.factory('Events', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'events/:id/?format=json',
    {id: "@id"},
    { 'getEvents': {method: 'GET', isArray: false},}
  );
})
.factory('Bookmark', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'bookmark/:id/?format=json', {id: "@id"}, {}
  );
})
.factory('Users', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'users/:id/?format=json', {id: "@id"},
    {'me': {method: 'GET', url: baseApiUrl+'users/me/?format=json'},
     'update': {method: 'PUT', url: baseApiUrl+'users/:id/?format=json'},
     'bookmarked': {method: 'GET', url: baseApiUrl+'users/:id/bookmarked/?format=json', isArray:true},
     'done': {method: 'GET', url: baseApiUrl+'users/:id/done/?format=json', isArray:true}}
  );
})
.factory('Login', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'login/?format=json'
  );
})
.factory('Logout', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'logout/?format=json'
  );
})
.factory('Signup', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'signup/?format=json'
  );
})
.factory('Facebook', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'facebook/?format=json', {},
    {'login': {method: 'POST'}}
  );
})
.factory('Child', function($resource, baseApiUrl) {
  return $resource(
    baseApiUrl+'child/:id/?format=json', {id: "@id"},
    {
      'update': {method: 'PUT', url: baseApiUrl+'child/:id/?format=json'},
    }
  );
})
.service('DataStore', function($q, $http) {
    var LOCAL_DATASTORE_KEY = '.key.datastore.alltoez.com';

    function getKV(key) {
      return window.localStorage.getItem(key + LOCAL_DATASTORE_KEY);
    }
    function setKV(key, value) {
       window.localStorage.setItem(key + LOCAL_DATASTORE_KEY, value);
    };

    return {
      set: setKV,
      get: getKV
    };
})
.service('AuthService', function($q, $http) {
  var LOCAL_TOKEN_KEY = 'key.token.alltoez.com';
  var isAuthenticated = false;
  var authToken;

  function loadUserCredentials() {
    var token = window.localStorage.getItem(LOCAL_TOKEN_KEY);
    if (token) {
      useCredentials(token);
    }
  }

  function storeUserCredentials(token) {
    window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
    useCredentials(token);
  }

  function useCredentials(token) {
    isAuthenticated = true;
    authToken = token;

    // Set the token as header for your requests!
    $http.defaults.headers.common['Authorization'] = "Token " + token;
  }

  function destroyUserCredentials() {
    authToken = undefined;
    isAuthenticated = false;
    $http.defaults.headers.common['Authorization'] = undefined;
    window.localStorage.removeItem(LOCAL_TOKEN_KEY);
  }

  var login = function(token) {
    storeUserCredentials(token);
  };

  var logout = function() {
    destroyUserCredentials();
  };

  loadUserCredentials();

  return {
    login: login,
    logout: logout,
    isAuthenticated: function() {return isAuthenticated;},
  };
});
