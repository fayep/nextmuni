var UI = require('ui');
var ajax = require('ajax');
var ls = localStorage;
var X2JS = require('x2js');

MySpecialKeys = function() {
  var ret = [], p;
  for (p in this) {
    // When I took this out of Object (because that was breaking the DOM)
    // it started detecting the keys function as having its own property
    if (p != "keys" && Object.prototype.hasOwnProperty.call(this, p)) {
      console.log(p);
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

var routes = {};
routes.keys = MySpecialKeys;
var stops = {};
stops.keys = MySpecialKeys;
var card; // for statuses, transient
var menu; // first choice
var secondMenu; // second (usually last) choice
var thirdMenu; // last only if second was in/outbound & >1 stop matches

routes.parse = function(arr) {
  var o = routes;
  o.routes = {};
  o.routes.keys = MySpecialKeys;
  o.direction = {};
  o.direction.keys = MySpecialKeys;
  arr.forEach(function(r) {
    o.routes[r.tag] = r;
    r.dir = {};
    r.dir.keys = MySpecialKeys;
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
  o.stops.keys = MySpecialKeys;
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
  var direction = '';
//  console.log(stops.stops.keys().map(function(s){
//    return JSON.stringify(stops.stops[s].route);
//  }));
  menu.section(0, {
    title: 'Nearby Stops',
    items: stops.stops.keys().map(function(s) {
      // Uncertainty is per stop
      var uncertain = true;
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

function showSchedule(data, status, request) {
  card.body('Done');
  var x2js = new X2JS();
  var p = x2js.xml_str2json(data).body.predictions;
  var d;
  var tag;
  var direction;
  console.log(JSON.stringify(p));
  if (Array.isArray(p) === true) {
    var sectionTitle = '';
    var items = [];

    if (p[0]._routeTag == p[1]._routeTag) {

      if ('direction' in p[0]) {
        sectionTitle = p[0]._routeTag+' '+p[0].direction._title;
      } else {
        sectionTitle = p[0]._routeTag+' '+p[0]._dirTitleBecauseNoPredictions;
      }
      items = p.map(function(v) {
        if ('direction' in v) {
          d = v.direction;
          return {
            title: x2js.asArray(d.prediction).map(function(pr) {
                     return pr._minutes;
                   })+' minutes',
            subtitle: v._stopTitle
          };
        } else {
          return {
            title: 'Not expected',
            subtitle: v._stopTitle
          };
        }
      });
    } else {
      sectionTitle = p[0]._stopTitle;
      items = p.map(function(v) {
        d = v.direction;
        if (d) {
          return {
            title: x2js.asArray(v.direction.prediction).map(function(pr) {
                     return pr._minutes;
                   })+' minutes',
            subtitle: v._routeTag+' '+d._title
          };
        } else {
          return {
            title: 'Not expected',
            subtitle: v._routeTag+' '+v._dirTitleBecauseNoPredictions
          }
        }
      });
    }
    thirdMenu = new UI.Menu();
    thirdMenu.section(0, {
      title: sectionTitle,
      items: items
    });
//    thirdMenu.on('select', stopSelected);
    thirdMenu.show();
    card.hide();
  } else {
    var sub;
    d = p.direction;
    if (d) {
      tag = d.prediction[0]._dirTag;
      direction = routes.direction[tag].dir[tag];

      if (direction.title.startsWith(direction.name)) {
      sub = direction.title.substring(direction.name.length+1,255);
      } else {
      sub = direction.title;
      }
      card.title(p._routeTag+' '+direction.name);
      card.subtitle(undefined);
      card.body(sub+'\n'+
                p._stopTitle+'\n'+
                x2js.asArray(d.prediction).map(function(pr) {
                  return pr._minutes;
                }).join(' ')+'\n'+
                'minutes.');
    } else {
      card.title(p._routeTag+' '+p._dirTitleBecauseNoPredictions);
      card.subtitle('Not expected');
      card.body(undefined);
    }
  }
}

function predict(items) {
  // console.log(items)
  card = new UI.Card({
    title: 'Next Muni',
    body: 'Fetching arrival data...'
  });
  card.show();
  console.log('http://webservices.nextbus.com/service/publicXMLFeed?command=predictionsForMultiStops&a=sf-muni&'+items.join('&'));
  ajax(
    {
      url: 'http://webservices.nextbus.com/service/publicXMLFeed?command=predictionsForMultiStops&a=sf-muni&'+items.join('&'),
      type: 'xml'
    },
    showSchedule,
    function(error, status, request) {
      card.subtitle('Failed.');
      card.body(error);
    }
  );
}

function stopSelected(e) {
  // Build nextbus URL for predictionsForMultiStops &a=sf-muni &stops=rtag|stoptag... varies by stoptag
  var items = e.item.stops.map(function(s) {
    return 'stops='+e.item.route+'%7c'+s;
  });
  // Call Nextbus URL with Prediction callback
  predict(items);
}

function onTopLevelMenuSelect(e) {
  var data = e.item.data;
  var items;
  console.log(data);
  if (e.sectionIndex === 0) {
    // Build nextbus URL for predictionsForMultiStops &a=sf-muni &stops=rtag|stoptag... varies by route
    items = stops.stops[data].route.map(function(v) {
      var route = routes.direction[v].tag;
      // Using | works on emulator, not on phone.  Use %7c on both.
      return 'stops='+route+'%7c'+data;
    });
    // Call Nexbus URL with Prediction callback
    predict(items);
  } else {
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
    secondMenu = new UI.Menu();
    secondMenu.section(0, {
      title: routes.routes[data].title,
      items: items
    });
    secondMenu.on('select', stopSelected);
    secondMenu.show();
  }
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
