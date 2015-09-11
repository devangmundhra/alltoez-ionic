angular.module('alltoez.controllers', ['ngOpenFB'])
.controller('AlltoezCtrl', function($scope, $stateParams, AuthService, Users) {
  $scope.currentUser = null;
  $scope.isAuthenticated = AuthService.isAuthenticated;

  $scope.setCurrentUser = function (user) {
    $scope.currentUser = user;
  };
  $scope.$watch(function () {
    return AuthService.isAuthenticated }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined') {
        Users.me().$promise.then(function(user) {
          $scope.setCurrentUser(user);
        });
      }
      else {
        $scope.setCurrentUser(null);
      }
    });
})
.controller('EventsCtrl', function($scope, $state, $stateParams, Events, Bookmark,
                                   $ionicModal, $ionicPopup, $http, DataStore,
                                   $cordovaGeolocation, $ionicPlatform, $q,
                                 $ionicLoading) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  // Initialize variables
  var currentStart = 0;
  $scope.selectedLocation = null;

  // Filter settings
  $scope.filterParams = {
    api: {},
    ui: {},
    lastRefreshTime: new Date()
  };

  $scope.events = [];

  $scope.priceSlider = {
    min: 100,
    max: 180,
    ceil: 500,
    floor: 0
  };
  $scope.noMoreItemsAvailable = false;

  //create datastore with default values
  var dsDefaults = {
      place: 'San Francisco',
      latitude: 37.7833,
      longitude: -122.4167,
      radius: 40,
      max_cost: 200
    };

  function loadDataStore() {
    var shouldGetCurLoc = false;
    for (key in dsDefaults) {
      if (!DataStore.get(key)) {
        shouldGetCurLoc = true;
        DataStore.set(key, dsDefaults[key]);
        console.log(dsDefaults[key])
      }
    }
    if (shouldGetCurLoc) {
      getCurLocation(function(position) {
        reverseGeocode(position, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
              if (results[1]) {
                setDataStoreFromNewAddress(results[1]);
                updateFilterUI();
              } else {
                alert("Unable to get a place for this coordinates");
              }
          } else {
            alert("Unable to get a place for this coordinates");
          };
        })
      }, function(err) {
        alert("Error in getting location: " + err);
      });
    }
  }

  function reverseGeocode(position, callback) {
    var lat  = position.coords.latitude;
    var lng = position.coords.longitude;
    var geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({ 'location': latlng }, callback);
  };

  function getCurLocation(success, error) {
    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $ionicPlatform.ready(function() {
      $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(success, error);
    });
  };

  function setDataStoreFromNewAddress(selectedLocation) {
    var center = selectedLocation.geometry.location;
    DataStore.set('place', selectedLocation.formatted_address);
    DataStore.set('longitude', center.K);
    DataStore.set('latitude', center.G);
  };

  updateFilterUI = function () {
    if ($scope.filterParams.api['category']) {
      $scope.filterParams.ui['of category '] = $scope.filterParams.api['category']
    }
    if (DataStore.get('latitude') && DataStore.get('longitude')) {
      $scope.filterParams.api['location'] = DataStore.get('latitude') + ',' +
                                        DataStore.get('longitude') + ',' +
                                        DataStore.get('radius');
    }
    if ($scope.filterParams.api['location']) {
      $scope.filterParams.ui['near '] = DataStore.get('place');
    }

    if (DataStore.get('max_cost')) {
      $scope.filterParams.ui['less than $'] = DataStore.get('max_cost');
    }
    $scope.filterParams.lastRefreshTime = new Date();
  };

  loadDataStore();
  updateFilterUI();

  $scope.$on('$ionicView.enter', function(e) {});

  $scope.doRefresh = function() {
    $ionicLoading.show();
    currentStart = 0;
    $scope.noMoreItemsAvailable = false;
    var params = {start:currentStart, limit:20};
    Events.getEvents(angular.extend(params, $scope.filterParams.api)).$promise.then(function(resp) {
      if (!resp.next) {
        $scope.noMoreItemsAvailable = true;
      }
      $scope.events = resp.results;
      currentStart += 20;

      // Stop the ion-refresher from spinning
      $scope.$broadcast('scroll.refreshComplete');
      $ionicLoading.hide();
    }, function(err){
      // Stop the ion-refresher from spinning
      $scope.noMoreItemsAvailable = true;
      $scope.$broadcast('scroll.refreshComplete');
      $ionicLoading.hide();
    });
  };

  $scope.addItems = function() {
    var params = {start:currentStart, limit:20};
    Events.getEvents(angular.extend(params, $scope.filterParams.api), function(resp) {
      if (!resp.next) {
        $scope.noMoreItemsAvailable = true;
      }
      $scope.events = $scope.events.concat(resp.results);
      currentStart += 20;
      $scope.$broadcast('scroll.infiniteScrollComplete');
    })
 };

 // Create a modal for event filters
 $ionicModal.fromTemplateUrl('templates/events-filter-modal.html', {
   scope: $scope,
   animation: 'slide-in-up'
 }).then(function(modal) {
   $scope.newFilter = {
     "price": DataStore.get('max_cost'),
     "waitingForCurLocation" : false
   };
   $scope.oldFilter = {
     "place" : DataStore.get('place')
   };

   $scope.modal = modal;

   $scope.updateModalLocation = function() {
     $scope.newFilter.waitingForCurLocation = true;
     getCurLocation(function(position) {
       reverseGeocode(position, function(results, status) {
         if (status == google.maps.GeocoderStatus.OK) {
           $scope.newFilter.waitingForCurLocation = false;
           if (results[0]) {
             $scope.newFilter.selectedLocation = results[0];
             $scope.$apply();
           } else {
             alert("Unable to get a place for this coordinates");
           }
         } else {
           alert("Unable to get a place for this coordinates");
         };

       })
     }, function(err) {
       alert("Error in getting location: " + err);
     });
   };

   $scope.placesAutocomplete = function(query) {
     if (!query || query.length < 3) {
       return;
     }
     var req = {};
     var d = $q.defer();

     req.address = query;
     var geocoder = new google.maps.Geocoder();
     geocoder.geocode(req, function(results, status) {
       if (status == google.maps.GeocoderStatus.OK) {
         d.resolve(results);
       } else {
         d.reject();
         alert("Unable to get a place for this coordinates");
       }
     });
    return d.promise;
  };
 });

 $scope.filterOptions = function() {
   $scope.modal.show();
 };

 $scope.applyFilters = function() {
   if ($scope.newFilter.selectedLocation) {
     var center = $scope.newFilter.selectedLocation.geometry.location;
     // Find events within 20 miles range
     $scope.filterParams.api['location'] = center.G + "," + center.K + "," + 20;
     setDataStoreFromNewAddress($scope.newFilter.selectedLocation);
   }

   $scope.filterParams.api['max_cost'] = $scope.newFilter.price;
   DataStore.set('max_cost', $scope.newFilter.price);

   // Update filter UI text
   updateFilterUI();

   $scope.doRefresh();
   $scope.modal.hide();
 };

 // Pop up for unauthenitcated bookmark
 $scope.unauthBookmark = function() {
   var authPopup = $ionicPopup.confirm({
     title: 'You need to be signed in to bookmark events.',
     template: 'Proceed to sign in?'
   });
   authPopup.then(function(res) {
     if (res) {
       $state.go('tab.account');
     } else {
       console.log('Not willing to sign in');
     }
   });
 };

 $scope.bookmark = function(event) {
   if ($scope.isAuthenticated()) {
     if (event.bookmark) {
       $http.delete(event.bookmark).then(
         function(response) {
           event.bookmark = undefined;
         }, function(response) {
           console.error("Error in deleting bookmark");
         })
     }
     else {
       Bookmark.save({"event": event.pk}).$promise.then(
         function(response) {
           event.bookmark = response.resource_uri;
         }, function(response) {
           console.error("Error in saving bookmark");
         }
       );
     }
   }
   else {
     $scope.unauthBookmark();
   }
 };
})

.controller('EventsDetailCtrl', function($scope, $stateParams, Events) {
  $scope.event = Events.get({id: $stateParams.eventId});
})

.controller('AccountCtrl', function($scope, $cordovaEmailComposer) {
  $scope.settings = {};

  $scope.contactEmail = function() {
    $ionicPlatform.ready(function() {
      $cordovaEmailComposer.isAvailable().then(function() {
        var email = {
          to: ['hi@alltoez.com'],
          subject: 'Feedback on Alltoez',
          body: '',
          isHtml: true
        };

       $cordovaEmailComposer.open(email).then(null, function () {
         // user cancelled email
       });
      }, function () {
        console.error("Email not available");
      });
    });
  };
})

.controller('UserCtrl', function($scope, $state, ngFB, Signup,
                                 Login, Facebook, AuthService,
                               $ionicPlatform, $cordovaToast, $ionicLoading) {
  $scope.$on('$ionicView.enter', function(e) {
    console.log("UserCtrl view active")
  });

  function showToastMsg(message) {
    console.log(message);
    $ionicPlatform.ready(function() {
      $cordovaToast.showShortTop(message);
    });
  };

  $scope.signUp = function(user) {
    $ionicLoading.show();
    console.log('Sign-Up', user);
    Signup.save(user).$promise.then(function(response){
      console.log("Response from Alltoez");
      AuthService.login(response.key);
      $state.go('tab.events');
      $ionicLoading.hide();
    }, function(err) {
      $ionicLoading.hide();
      user = err.data;
      var errStr = "Error signing in " + err.statusText + "\n";
      if (err.data.username) {
        errStr += "email: " + err.data.username + "\n";
      }
      if (err.data.password) {
        errStr += "password: " + err.data.password + "\n";
      }
      if (err.data.non_field_errors) {
        errStr += err.data.non_field_errors + "\n";
      }
      showToastMsg(errStr);
    });
  };

  $scope.logIn = function(user) {
    $ionicLoading.show();
    Login.save(user).$promise.then(function(response){
      console.log("Response from Alltoez");
      AuthService.login(response.key);
      $state.go('tab.events');
      $ionicLoading.hide();
    }, function(err) {
      $ionicLoading.hide();
      var errStr = "Error signing in " + err.statusText + "\n";
      if (err.data.username) {
        errStr += "email: " + err.data.username + "\n";
      }
      if (err.data.password) {
        errStr += "password: " + err.data.password + "\n";
      }
      if (err.data.non_field_errors) {
        errStr += err.data.non_field_errors + "\n";
      }
      showToastMsg(errStr);
    });
  };

  $scope.fbLogin = function () {
    $ionicLoading.show();
    ngFB.login({scope: 'email, public_profile, user_friends'}).then(
      function (response) {
        if (response.status === 'connected') {
          console.log('Facebook login succeeded');
          Facebook.login({access_token: response.authResponse.accessToken})
          .$promise.then(function(response) {
             console.log("Response from Alltoez");
             AuthService.login(response.key);
             $state.go('tab.events');
             $ionicLoading.hide();
           });
        } else {
          $ionicLoading.hide();
          showToastMsg('Facebook login failed');
          AuthService.logout();
        }
      }
    );
  };

  $scope.signOut = function() {
    Logout.save().$promise.then(function(response) {
      AuthService.logout();
      $state.go('tab.account');
    }, function(err) {
      showToastMsg('Error logging out');
      AuthService.logout();
    });
  };
})

.filter('format_event_datetime', function() {
  return function(value) {
    if (!value) return "";
    if (value.indexOf(': ') === -1)
         // No point converting this into table form since this is not in the Days: Time format
         return value;
    split_string = '\r\n';
    value = value.replace(split_string+split_string, split_string);
    in_lines = value.split(split_string);
    out_lines = ['|||', '|:-|-:|'];
    for (i = 0; i < in_lines.length; i++)
    {
      line = in_lines[i];
      split_line = line.split(': ');
      if (split_line.length === 1) {
       out_lines.push("|"+split_line[0]+"||")
      }
      else {
       out_lines.push("|"+split_line.join('|')+"|")
      }
    }
    output = out_lines.join(split_string);
    return output;
  }
})
.filter('format_event_age', function() {
  return function(min_age, max_age) {
    if (min_age === 0 && max_age === 100) {
      return "Family Event";
    }
    else if (min_age != 0) {
      if (max_age != 100) {
        return min_age + " - " + max_age + " yo"
      }
      else {
        return min_age + "+ yo"
      }
    }
    else { // max_age != 100
      return max_age + " yo and below"
    }
  }
});
