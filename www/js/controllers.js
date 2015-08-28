angular.module('alltoez.controllers', [])

.controller('EventsCtrl', function($scope, Events) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  var currentStart = 0;
  $scope.$on('$ionicView.enter', function(e) {
    console.log("EventsCtrl view active")
  });
  $scope.doRefresh = function() {
    currentStart = 0;
    Events.getEvents({start:currentStart, limit:20}, function(resp) {
       $scope.events = resp.results;
       currentStart += 20;
       // Stop the ion-refresher from spinning
       $scope.$broadcast('scroll.refreshComplete');
     });
  };
  $scope.events = [];
  $scope.addItems = function() {
    Events.getEvents({start:currentStart, limit:20}, function(resp) {
      $scope.events = $scope.events.concat(resp.results);
      currentStart += 20;
      $scope.$broadcast('scroll.infiniteScrollComplete');
    })
 }
})

.controller('EventsDetailCtrl', function($scope, $stateParams, Events) {
  $scope.event = Events.get({id: $stateParams.eventId});
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
