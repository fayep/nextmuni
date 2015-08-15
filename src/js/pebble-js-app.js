var locationOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 10000
};

var xmlhttp = new XMLHttpRequest();

xmlhttp.onreadystatechange = function() {
if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
    var response = JSON.parse(xmlhttp.responseText);
    xmlhttp.callback(response);
    }
}

function nextBusCallback(response) {
  Pebble.sendAppMessage({'latitude': response.stops[0].title, 'longitude': ''});
}

function locationSuccess(pos) {
  var url = 'http://hosted.zippysoft.com/nearest/sf-muni/'+pos.coords.latitude.toString()+'/'+pos.coords.longitude.toString();
  xmlhttp.callback = nextBusCallback;
  xmlhttp.open('GET', url, true);
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
}

Pebble.addEventListener("ready",
  function(e) {
    console.log("Hello world! - Sent from your javascript application.");
    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
  }
);
