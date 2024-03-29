angular.module('alltoez.controllers', ['ngOpenFB', 'angularMoment',])
.controller('AlltoezCtrl', function($scope, $stateParams, AuthService,
                                    Users, $ionicHistory, DataStore,
                                    $ionicPlatform, $cordovaToast) {
  var ANON_USER_ID_CONST = "anonUserId";

  $scope.currentUser = null;
  $scope.isAuthenticated = AuthService.isAuthenticated();

  function retrieveOrCreateUser() {
    if (AppSettings.debug) {
      return;
    }

    var userId;
    if ($scope.currentUser) {
      userId = $scope.currentUser;
    } else {
      userId = DataStore.get(ANON_USER_ID_CONST);
      if (!userId) {
        userId = Ionic.User.anonymousId();
        DataStore.set(ANON_USER_ID_CONST, userId);
      }
    }
    Ionic.User.load(userId).then(function(user){
      Ionic.User.current(user); // Tell Ionic about user and set to local storage
    }, function(error){
      var newUser = Ionic.User.current(); // No user found at Ionic.io, create new
      newUser.id = userId;
      newUser.save(); // Saves user to Ionic.io as new user, saves to local storage
    });
  }

  $scope.setCurrentUser = function (user) {
    $scope.currentUser = user;
  };

  function getUserInfo(callback) {
    Users.me().$promise.then(function(user) {
      $scope.setCurrentUser(user);
      callback();
    }, function(err) {
      AuthService.logout();
      $scope.setCurrentUser(null);
      callback();
    });
  }

  $scope.$watch(function () {
    return AuthService.isAuthenticated() }, function (newVal, oldVal) {
      $scope.isAuthenticated = newVal;
      if (newVal === true) {
        getUserInfo(retrieveOrCreateUser);
      }
      else {
        $scope.setCurrentUser(null);
        retrieveOrCreateUser();
      }
      $ionicHistory.clearCache();
    });

    $scope.showToastMsg = function (message) {
      console.log(message);
      $ionicPlatform.ready(function() {
        $cordovaToast.showLongTop(message);
      });
    };
})
.controller('EventsCtrl', function($scope, $state, $stateParams, Events, Bookmark,
                                   $ionicModal, $ionicPopup, $http, DataStore,
                                   $cordovaGeolocation, $ionicPlatform, $q,
                                   $ionicLoading, $ionicHistory, Category) {
  // Initialize variables
  var currentOffset = 0;
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
  $scope.fetchingEvents = true;

  //create datastore with default values
  var dsDefaults = {
      place: 'San Francisco, CA, USA',
      latitude: 37.7833,
      longitude: -122.4167,
      radius: 40,
      max_cost: 200
    };

  function loadDataStore() {
    // Get parent categories
    $scope.parentCategories = Category.query({
      'parent_category': true,
      'font_awesome_icon_class': true})

    var shouldGetCurLoc = false;
    for (key in dsDefaults) {
      if (!DataStore.get(key) || typeof DataStore.get(key) === "undefined" || DataStore.get(key) === "undefined") {
        shouldGetCurLoc = true;
        DataStore.set(key, dsDefaults[key]);
      }
    }

    if (shouldGetCurLoc) {
      getCurLocation(function(result) {
        setDataStoreFromNewAddress(result);
        window.location.reload(true);
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

  function getCurLocation(success) {
    var posOptions = {timeout: 2*60*1000, enableHighAccuracy: false};
    $ionicPlatform.ready(function() {
      $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function(position) {
        reverseGeocode(position, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            var result = results[1] || results[0];
            if (result) {
              success(result);
            } else {
              $scope.showToastMsg("Unable to get a place for this coordinates");
            }
          } else {
            $scope.showToastMsg("Unable to get a place for this coordinates");
          };
        })
      }, function(err) {
        alert_msg = "Error in getting location. ";
        switch(err.code) {
          case 1:
            alert_msg += 'You haven\'t shared your location. Please enable it in Settings.'
            break;
          case 2:
            alert_msg += 'Couldn\'t detect your current location.'
            break;
          case 3:
            alert_msg += 'Retrieving your position timeouted.'
            break;
          default:
            alert_msg += 'Retrieving your position failed for unknown reason. Error code: ' + err.code + '. Error message: ' + err.message
            break;
        }
        $scope.showToastMsg(alert_msg);
      });
    });
  };

  function setDataStoreFromNewAddress(selectedLocation) {
    var center = selectedLocation.geometry.location;
    DataStore.set('place', selectedLocation.formatted_address);
    DataStore.set('longitude', center.lng());
    DataStore.set('latitude', center.lat());
  };

  function updateFilterUI() {
    if ($stateParams.category)
    {
      $scope.filterParams.api['category'] = $stateParams.category;
    }
    if ($scope.filterParams.api['category']) {
      $scope.filterParams.ui['category '] = $scope.filterParams.api['category']
    } else {
      $scope.filterParams.ui['category '] = '';
      delete $scope.filterParams.ui['category '];
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

  function getEvents(params, success, failure) {
    $scope.fetchingEvents = true;
    Events.getEvents(angular.extend(params, $scope.filterParams.api)).$promise
    .then(function(resp) {
      if (!resp.next) {
        $scope.noMoreItemsAvailable = true;
      }
      $scope.eventCount = resp.count;
      success(resp);
      $scope.fetchingEvents = false;
    },
    function(err) {
      $scope.noMoreItemsAvailable = true;
      failure(err);
      $scope.fetchingEvents = false;
    });
  };

  $scope.doRefresh = function() {
    $ionicLoading.show();
    currentOffset = 0;
    $scope.noMoreItemsAvailable = false;
    var params = {offset:currentOffset, limit:20};
    getEvents(params,
      function(resp) {
        $scope.events = resp.results;
        currentOffset += 20;

        // Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
        $ionicLoading.hide();
      },
      function(err) {
        // Stop the ion-refresher from spinning
        $scope.$broadcast('scroll.refreshComplete');
        $ionicLoading.hide();
      });
  };

  $scope.addItems = function() {
    var params = {offset:currentOffset, limit:20};
    getEvents(params,
      function(resp) {
        $scope.events = $scope.events.concat(resp.results);
        currentOffset += 20;
        $scope.$broadcast('scroll.infiniteScrollComplete');
      },
      function(err) {}
    );
 };

 // Create a modal for event filters
 $ionicModal.fromTemplateUrl('templates/events-filter-modal.html', {
   scope: $scope,
   animation: 'slide-in-up'
 }).then(function(modal) {
   $scope.newFilter = {
     "category": $stateParams.category || "all",
     "price": DataStore.get('max_cost'),
     "waitingForCurLocation" : false
   };
   $scope.oldFilter = {
     "place" : DataStore.get('place')
   };

   $scope.modal = modal;

   $scope.updateModalLocation = function() {
     $scope.newFilter.waitingForCurLocation = true;
     getCurLocation(function(result) {
       $scope.newFilter.waitingForCurLocation = false;
       $scope.newFilter.selectedLocation = result;
       $scope.$apply();
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
     // Find events within 20 miles range- lng + lat + miles
     $scope.filterParams.api['location'] = center.lng() + "," + center.lat() + "," + 20;
     setDataStoreFromNewAddress($scope.newFilter.selectedLocation);
   }

   $scope.filterParams.api['max_cost'] = $scope.newFilter.price;
   DataStore.set('max_cost', $scope.newFilter.price);

   if ($scope.newFilter.category === "all") {
     $scope.filterParams.api['category'] = '';
     delete $scope.filterParams.api.category;
     $state.go($state.$current, {category: null}, { reload: true });
   } else {
     $scope.filterParams.api['category'] = $scope.newFilter.category;
     $stateParams.category = $scope.newFilter.category;
     $state.go($state.$current, {category: $scope.newFilter.category}, { reload: true });
   }
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
       $state.transitionTo('tab.account', {}, {reload: true});
     } else {
       console.error('Not willing to sign in');
     }
   });
 };

 $scope.bookmark = function(event) {
   if ($scope.isAuthenticated) {
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

.controller('EventsDetailCtrl', function($scope, $stateParams, Events, $ionicLoading) {
  $ionicLoading.show();
  Events.get({id: $stateParams.eventId}).$promise.then(
    function(response) {
      $scope.event = response;
      $ionicLoading.hide();
    },
    function(err) {
      $ionicLoading.hide();
      $scope.showToastMsg("Error in fetching event details");
    });
})

.controller('AccountCtrl', function($scope, $ionicPlatform,
                                    $cordovaEmailComposer) {
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

.controller('UserCtrl', function($scope, $state, ngFB, Signup, $ionicHistory, $http,
                                 Login, Facebook, AuthService, Logout, Users, Password,
                                 $ionicLoading) {
  $scope.$on('$ionicView.enter', function(e) {
    console.log("UserCtrl view active");
  });

  if (AuthService.isAuthenticated() && $scope.currentUser)
  {
    Users.bookmarked({"id": $scope.currentUser.pk}).$promise.then(function(resp){
      $scope.bookmarked_events = resp;
    }, function(err){
      $scope.showToastMsg(err);
    });
  }

  function getUserAndHideLoading() {
    Users.me().$promise.then(function(user) {
      $scope.setCurrentUser(user);
      if (user.profile.is_complete) {
        $state.transitionTo('tab.events', {}, {reload: true});
      } else {
        $state.transitionTo('tab.update-profile', {}, {reload: true})
      }
      $ionicLoading.hide();
    }, function(err) {
      $ionicLoading.hide();
      $scope.showToastMsg("Error in getting user info " + JSON.stringify(err.data))
    });
  };

  $scope.forgotPassword = function(email) {
    Password.reset({'email': email}).$promise.then(function(response) {
      var msg = "Password reset email has been sent. Please check your email: " + email;
      $scope.showToastMsg(msg);
      $state.transitionTo("tab.login", {}, {reload: true});
    }, function(err) {
      $scope.showToastMsg("Error in getting resetting password: " + JSON.stringify(err.data))
    });
  }

  $scope.signUp = function(user) {
    $ionicLoading.show();
    user.username = user.email;
    Signup.save(user).$promise.then(function(response){
      AuthService.login(response.key);
      getUserAndHideLoading();
    }, function(err) {
      $ionicLoading.hide();
      user = err.data;
      var errStr = "Error signing in \n";
      if (err.data.username) {
        errStr += "email: " + err.data.username + "\n";
      }
      if (err.data.password) {
        errStr += "password: " + err.data.password + "\n";
      }
      if (err.data.non_field_errors) {
        errStr += err.data.non_field_errors + "\n";
      }
      $scope.showToastMsg(errStr);
    });
  };

  $scope.logIn = function(user) {
    $ionicLoading.show();
    Login.save(user).$promise.then(function(response){
      AuthService.login(response.key);
      getUserAndHideLoading();
      $ionicHistory.clearHistory();
    }, function(err) {
      $ionicLoading.hide();
      var errStr = "Error signing in \n";
      if (err.data.username) {
        errStr += "email: " + err.data.username + "\n";
      }
      if (err.data.password) {
        errStr += "password: " + err.data.password + "\n";
      }
      if (err.data.non_field_errors) {
        errStr += err.data.non_field_errors + "\n";
      }
      $scope.showToastMsg(errStr);
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
            AuthService.login(response.key);
            getUserAndHideLoading();
            $ionicHistory.clearHistory();
           });
        } else {
          $ionicLoading.hide();
          $scope.showToastMsg('Facebook login failed');
          AuthService.logout();
        }
      }
    );
  };

  $scope.signOut = function() {
    Logout.save().$promise.then(function(response) {
      $state.transitionTo('tab.account', {}, {reload: true});
      $ionicHistory.clearHistory();
      AuthService.logout();
      $scope.setCurrentUser(null);
    }, function(err) {
      $scope.showToastMsg('Error logging out ' + JSON.stringify(err));
    });
  };
})
.controller('UserActionCtrl', function($scope, $state, Users, $ionicLoading) {
  $scope.$on('$ionicView.enter', function(e) {
    console.log("UserActionCtrl view active");
  });

  function getBookmarkedEvents(success, failure) {
    Users.bookmarked({"id": $scope.currentUser.pk}).$promise.then(function(resp){
      success(resp);
    }, function(err){
      failure(err);
    });
  };

  $scope.doRefresh = function() {
    $ionicLoading.show();
    getBookmarkedEvents(function (resp) {
      $scope.bookmarked_events = resp;
      // Stop the ion-refresher from spinning
      $scope.$broadcast('scroll.refreshComplete');
      $ionicLoading.hide();
    }, function (err) {
      console.error(err);
      // Stop the ion-refresher from spinning
      $scope.$broadcast('scroll.refreshComplete');
      $ionicLoading.hide();
    });
  };

  getBookmarkedEvents(function (resp) {
    $scope.bookmarked_events = resp;
  }, function (err) {
    console.error(err);
  });
})
.controller('ProfileUpdateCtrl', function($scope, $state, AuthService, Users, Child,
                                          $ionicLoading, $ionicHistory) {
  $scope.$on('$ionicView.enter', function(e) {
    console.log("ProfileUpdateCtrl view active");
  });

  $scope.countries = [
        {name: 'India', code: 'IN'},
        {name: 'United States', code: 'US'}
    ];

  $scope.user = $scope.currentUser;

  $scope.addChild = function () {
    $scope.user.children.push({})
  };

  $scope.updateProfile = function (user) {
    var children = user.children;

    children.forEach(function(child) {
      if (child.delete) {
        Child.delete(child).$promise.then(function(resp){}, function(err){
          console.error(JSON.stringify(err));
        });
      } else {
        if (child.pk) {
          Child.update(child).$promise.then(function(resp){}, function(err){
            console.error(JSON.stringify(err));
          });
        } else {
          Child.save(child).$promise.then(function(resp){}, function(err){
            console.error(JSON.stringify(err));
          });
        }
      }
    });

    Users.update(user).$promise.then(function(resp){
      $scope.setCurrentUser(resp);
      $state.transitionTo('tab.events', {}, {reload: true});
      $ionicHistory.clearHistory();
    },
    function(err){
      console.error("Error updating profile " + JSON.stringify(err));
    });
  }
})
// Filters
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
})
.filter('child_gender_to_string', function() {
  return function(value) {
    if (value === 0) {
      return "boy";
    } else {
      return "girl";
    }
  }
})
.filter('adult_gender_to_string', function() {
  return function(value) {
    if (value === 0) {
      return "male";
    } else {
      return "female";
    }
  }
})
.filter('lte', function() {
  return function(value, limit) {
    return value && value <= limit;
  }
})
.filter('gte', function() {
  return function(value, limit) {
    return value && value >= limit;
  }
})
// Directives
.directive("dynamicName",function($compile){
  return {
      restrict:"A",
      terminal:true,
      priority:1000,
      link:function(scope,element,attrs){
          element.attr('name', scope.$eval(attrs.dynamicName));
          element.removeAttr("dynamic-name");
          $compile(element)(scope);
      }
   };
})
.directive('appVersion', function ($ionicPlatform) {
  return function(scope, elm, attrs) {
    $ionicPlatform.ready(function() {
      cordova.getAppVersion(function (version) {
        elm.text(version);
      });
    });
  };
});
