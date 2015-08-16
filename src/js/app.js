var UI = require('ui');
var ajax = require('ajax');

if(!Object.keys) Object.keys = function(o){
   if (o !== Object(o))
      throw new TypeError('Object.keys called on non-object');
   var ret=[],p;
   for(p in o) if(Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
   return ret;
}

if(!Object.values) Object.values = function(o){
   if (o !== Object(o))
      throw new TypeError('Object.keys called on non-object');
   return Object.keys(o).map(function(v){
     return o[v];
   });
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var routes = {};
var stops = {};
var card;
var menu;

routes.parse = function(arr) {
  var o = routes;
  o.routes = {};
  o.direction = {};
  arr.forEach(function(r) {
    o.routes[r.tag] = r;
    r.dir = {};
    r.direction.forEach(function(d) {
      d.stops = [];
      r.dir[d.tag] = d;
      o.direction[d.tag] = r;
    });
    delete(r.direction);
  });
};

routes.menu = function() {
  menu.section(1, {
    title: 'Nearby Routes',
    items: Object.keys(routes.routes).map(function(r) {
      return {
        title: routes.routes[r].tag,
        subtitle: routes.routes[r].title.substring(routes.routes[r].tag.length+1,255)
      }
    })
  });
}

stops.parse = function(arr) {
  var o = stops;
  var rt;
  o.stops = {};
  arr.forEach(function(s) {
    o.stops[s.tag] = s;
    s.route.forEach(function(r){
      rt = routes.direction[r];
      rt.dir[r].stops.push(s.tag);
    });
  });
};

stops.menu = function() {
  menu = new UI.Menu();
  menu.section(0, {
    title: 'Nearby Stops',
    items: Object.keys(stops.stops).map(function(s){
    return {
      title: stops.stops[s].tag+' '+Object.values(stops.stops[s].route).map(function(v) {
               return routes.direction[v].tag;
             }),
      subtitle: stops.stops[s].title
    }})
  });
  menu.show();
  card.hide();
  menu.on('select', function(e){
    console.log(e.sectionIndex+' '+e.item.title);
  });
}

function onNearestOK(data, status, request) {
  console.log('loaded data');
  card.subtitle('Parsing...');
  card.show();
  routes.parse(data.routes);
  stops.parse(data.stops);
  stops.menu();
  routes.menu();
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
