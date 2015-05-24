var locationOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 10000
};

function locationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
  Pebble.sendAppMessage({'latitude': pos.coords.latitude.toString(),
                         'longitude': pos.coords.longitude.toString()});
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
