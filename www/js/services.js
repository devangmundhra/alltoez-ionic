angular.module('alltoez.services', ['ngResource'])
.constant("BASE_API_URL_CONST", AppSettings.baseApiUrl)
.factory('Events', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'events/:id/?format=json',
    {id: "@id"},
    { 'getEvents': {method: 'GET', isArray: false},}
  );
})
.factory('Category', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'category/?format=json'
  );
})
.factory('Bookmark', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'bookmark/:id/?format=json', {id: "@id"}, {}
  );
})
.factory('Users', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'users/:id/?format=json', {id: "@id"},
    {'me': {method: 'GET', url: BASE_API_URL_CONST+'users/me/?format=json'},
     'update': {method: 'PUT', url: BASE_API_URL_CONST+'users/:id/?format=json'},
     'bookmarked': {method: 'GET', url: BASE_API_URL_CONST+'users/:id/bookmarked/?format=json', isArray:true},
     'done': {method: 'GET', url: BASE_API_URL_CONST+'users/:id/done/?format=json', isArray:true}}
  );
})
.factory('Login', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'login/?format=json'
  );
})
.factory('Logout', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'logout/?format=json'
  );
})
.factory('Signup', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'signup/?format=json'
  );
})
.factory('Facebook', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'facebook/?format=json', {},
    {'login': {method: 'POST'}}
  );
})
.factory('Child', function($resource, BASE_API_URL_CONST) {
  return $resource(
    BASE_API_URL_CONST+'child/:id/?format=json', {id: "@id"},
    {
      'update': {method: 'PUT', url: BASE_API_URL_CONST+'child/:id/?format=json'},
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
    function removeKV(key) {
      window.localStorage.removeItem(key);
    };
    return {
      set: setKV,
      get: getKV,
      remove: removeKV
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
