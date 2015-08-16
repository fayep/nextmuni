var UI = require('ui');
var ajax = require('ajax');
var ls = localStorage;


Object.prototype.keys = function() {
  var ret = [], p;
  for (p in this) {
    if (Object.prototype.hasOwnProperty.call(this, p)) {
      ret.push(p);
    }
  }
  return ret;
};

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
    items: routes.routes.keys().map(function(r) {
      return {
        title: routes.routes[r].tag,
        subtitle: routes.routes[r].title.substring(routes.routes[r].tag.length + 1, 255)
      };
    })
  });
};

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
  var uncertain = true;
  var direction = '';
//  console.log(stops.stops.keys().map(function(s){
//    return JSON.stringify(stops.stops[s].route);
//  }));
  menu.section(0, {
    title: 'Nearby Stops',
    items: stops.stops.keys().map(function(s) {
    return {
      title: stops.stops[s].tag+' '+stops.stops[s].route.map(function(v) {
                if (direction != routes.direction[v].dir[v].name) {
                  if (uncertain) {
                    direction = routes.direction[v].dir[v].name;
                    uncertain = false;
                  } else {
                    uncertain = true;
                  }
                }
               return routes.direction[v].tag;
             })+' '+direction,
      subtitle: stops.stops[s].title
    };
    })
  });
  menu.show();
  card.hide();
  menu.on('select', onTopLevelMenuSelect);
};

function onTopLevelMenuSelect(e) {
  newMenu = new UI.Menu();
//  newMenu.section(0, {
//    title: e.title
//  });
  if (e.sectionIndex === 0) {
    var stop = e.title.substring(0,e.title.indexOf(' '));

  }
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
