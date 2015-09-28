// Alltoez App

// angular.module is a global place for creating, registering and retrieving Angular modules
// the 2nd parameter is an array of 'requires'
// 'alltoez.services' is found in services.js
// 'alltoez.controllers' is found in controllers.js
angular.module('alltoez', ['ionic','ionic.service.core', 'alltoez.controllers', 'alltoez.services',
'ng-showdown', 'ngOpenFB', 'ngCordova', 'ion-autocomplete'])
.constant('AUTH_EVENTS', {
  notAuthenticated: 'auth-not-authenticated',
  notAuthorized: 'auth-not-authorized'
})
.constant('$ionicLoadingConfig', {
  template: '<ion-spinner icon="spiral" class="spinner-energized"></ion-spinner>'
})
.run(function($ionicPlatform, ngFB) {
  ngFB.init({appId: '436853689787509'});
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider, $showdownProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html'
  })

  // Each tab has its own nav history stack:

  .state('tab.events', {
    url: '/events?category&location&min_age&max_age&max_cost',
    views: {
      'tab-events': {
        templateUrl: 'templates/tab-events.html',
        controller: 'EventsCtrl'
      }
    }
  })
  .state('tab.event-detail', {
    url: '/events/:eventId',
    views: {
      'tab-events': {
        templateUrl: 'templates/event-detail.html',
        controller: 'EventsDetailCtrl'
      }
    }
  })
  // Account management
  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  })
  .state('tab.signin', {
    url: '/sign-in',
    views: {
      'tab-account': {
        templateUrl: 'templates/accounts/sign-in.html',
        controller: 'UserCtrl'
      },
    }
  })
  .state('tab.user-detail', {
    url: '/user/:userId',
    views: {
      'tab-account': {
        templateUrl: 'templates/accounts/user-detail.html',
        controller: 'UserCtrl'
      },
    }
  })
  .state('tab.forgotpassword', {
    url: '/forgot-password',
    views: {
      'tab-account': {
        templateUrl: 'templates/accounts/forgot-password.html',
        controller: 'UserCtrl'
      }
    }
  })
  .state('tab.bookmakred-events', {
    url: '/bookmarked-events',
    views: {
      'tab-account': {
        templateUrl: 'templates/events/bookmarked-events.html',
        controller: 'UserCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/events');

  // Set config option for markdown
  // Tables for event time detail
  $showdownProvider.setOption("tables", true);
});
