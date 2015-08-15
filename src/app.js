var UI = require('ui');
var ajax = require('ajax');

var routes = {};
var stops = {};
var card;

routes.parse = function(arr) {
  var o = this;
  o.routes = {};
  arr.forEach(function(r) {
    o.routes[r.tag] = r;
    o.routes[r.tag].stops = {};
    r.direction.forEach(function(dir) {
      dir.stops = [];
      o.direction[dir.tag] = r;
    });
  });
};

stops.parse = function(arr) {
  var o = this;
  var rt;
  o.stops = {};
  o.routes = {};
  arr.forEach(function(s) {
    o.stops[s.tag] = s;
    s.route.forEach(function(r){
      rt = routes.direction[r.tag];
      o.routes[rt.tag] = s;
      rt.direction[r.tag].stops.push(s.tag);
      routes.routes[rt.tag].stops[s.tag] = s;
    });
    s.routes = o.routes.keys;
  });
};

function onNearestOK(data, status, request) {
  console.log('loaded data');
  card.subtitle('Parsing...');
  card.show();
  routes.parse(data.routes);
  stops.parse(data.stops);
  console.log('stops: '+stops[1].name.toString());
}

function onNearestError(error, status, request) {
  card.subtitle('Failed.');
  card.body(error);
  card.show();
}

function onLocationOK(pos) {
  console.log('loading data');
  card.subtitle('Loading...');
  card.show();
  ajax(
    {
      url: 'http://hosted.zippysoft.com/nearest/sf-muni/'+pos.coords.latitude.toString()+'/'+pos.coords.longitude.toString(),
      type: 'json'
    }, onNearestOK, onNearestError);
}

function onLocationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
  card.subtitle('Failed.');
  card.body('Failed to locate you.');
  card.show();
}

function onAppReady(e) {
  console.log('fetching location');
  card.subtitle('Fetching...');
  card.show();
  navigator.geolocation.getCurrentPosition(
    onLocationOK, onLocationError,
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000
    });
}

card = new UI.Card({
  title: 'Next Muni',
  subtitle: 'Starting...'
});

onAppReady('woot');