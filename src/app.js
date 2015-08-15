var UI = require('ui');
var ajax = require('ajax');


var routes;
var stops;
var card;

function onNearestOK(data, status, request) {
  console.log('loaded data');
  card.subtitle('Parsing...');
  card.show();
  routes = data.routes;
  stops = data.stops;
  console.log('stops: '+stops.toString());
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

Pebble.addEventListener('ready', onAppReady);
card.show();
