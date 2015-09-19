var UI = require('ui');
var ajax = require('ajax');
var ls = localStorage;
var X2JS = require('x2js');

Object.prototype.keys = function() {
  var ret = [], p;
  for (p in this) {
    if (Object.prototype.hasOwnProperty.call(this, p)) {
      ret.push(p);
    }
  }
  return ret;
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
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
var card; // for statuses, transient
var menu; // first choice
var secondMenu; // second (usually last) choice
var thirdMenu; // last only if second was in/outbound & >1 stop matches

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
        subtitle: routes.routes[r].title.substring(routes.routes[r].tag.length + 1, 255),
        data: r
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
      title: stops.stops[s].route.map(function(v) {
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
      subtitle: stops.stops[s].title,
      data: s
    };
    })
  });
  menu.show();
  card.hide();
  menu.on('select', onTopLevelMenuSelect);
};

function showSchedule(e) {
  card = new UI.Card({
    title: e.item.route,
    subtitle: e.item.stops,
    body: 'Fetching arrival data...'
  });
  card.show();
  console.log('fetch schedule for '+e.item.stops+' '+e.item.route);
  ajax(
    {
      url: 'http://webservices.nextbus.com/service/publicXMLFeed?command=messages&a=sf-muni&r=N',
      type: 'xml'
    },
    function(data, status, request) {
      x2js = new X2JS();
      xml = x2js.xml_str2json(data);
      console.log(JSON.stringify(xml));
    },
    function(error, status, request) {
      console.log(error);
    }
  );
}
function selectStop(e) {
  if (e.item.stops.length == 1) {
    e.item.stops = e.item.stops[0];
    showSchedule(e);
  } else {
    console.log(JSON.stringify(e.item));
  }
}

function onTopLevelMenuSelect(e) {
  secondMenu = new UI.Menu();
  var data = e.item.data;
  var sectionTitle;
  var items;
  console.log(data);
//  newMenu.section(0, {
//    title: e.title
//  });
  if (e.sectionIndex === 0) {
    sectionTitle = stops.stops[data].title;
    items = stops.stops[data].route.map(function(v) {
      var route = routes.direction[v].tag;
      var direction = routes.direction[v].dir[v].title;
      return {
        title: route,
        subtitle: direction,
        stops: data,
        route: route
      };
    });
    secondMenu.on('select', showSchedule);
  } else {
    sectionTitle = routes.routes[data].title;
    items = routes.routes[data].dir.keys().map(function(v) {
      var direction = routes.routes[data].dir[v];
      var sub;
      if (direction.title.startsWith(direction.name)) {
        sub = direction.title.substring(direction.name.length+1,255);
      } else {
        sub = direction.title;
      }
      return {
        title: direction.name,
        subtitle: sub,
        route: data,
        stops: direction.stops,
        direction: v
      };
    });
    secondMenu.on('select', selectStop);
  }
  secondMenu.section(0, {
    title: sectionTitle,
    items: items
  });
  secondMenu.show();
}

function onNearestOK(data, status, request) {
  console.log('loaded data');
  if (data.routes === []) {
    card.subtitle("Can't locate you");
    card.body("Please try again later.");
  } else {
    card.subtitle('Parsing...');
    routes.parse(data.routes);
    stops.parse(data.stops);
    stops.menu();
    routes.menu();
  }
}

function onNearestError(error, status, request) {
  card.subtitle('Failed.');
  card.body(error);
}

function onLocationOK(pos) {
  console.log('loading data');
  card.subtitle('Loading...');
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
}

function onAppReady(e) {
  console.log('fetching location');
  card.subtitle('Locating...');
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
  title: 'Next Muni'
});

onAppReady('woot');
