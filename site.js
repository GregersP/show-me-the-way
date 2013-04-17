var paused = false,

    // Map in the center 
    /*
    map = L.map('map', {
        zoomControl: false
    }).setView([55.677781, 12.569228], 13),
    bing = new L.BingLayer('Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU', 'Aerial')
        .addTo(map),
    */
    map = L.map('map', {
        zoomControl: false
    }).setView([55.677781, 12.569228], 13),
    fotforaar = new L.tileLayer.wms("http://kortforsyningen.kms.dk/service", {
	servicename: 'orto_foraar', //'print_topo_skaermkort',
	layers: 'orto_foraar', //'dtk_skaermkort',
	format: 'image/png',
	ticket: getKfTicket(),  // Ticket for Kortforsyningen, proprietary code for ticket - do not use this unless agreed with Septima.
	transparent: true,
	attribution: "Imagery ©Geodatastyrelsen",
	options:{maxZoom: 18},
	wms:true
    }).addTo(map),
	
   // Little overview to the right
    overview_map = L.map('overview_map', {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false
    }).setView([55.677781, 12.569228], 4),
    osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 8,
        maxZoom: 12,
        attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(overview_map),
    changesToShowEveryMinute = 20;

// Remove Leaflet shoutouts
map.attributionControl.setPrefix('');
overview_map.attributionControl.setPrefix('');

// The number of changes to show per minute

osmStream.runFn(function(err, data) {
    var filteredChanges = [];

    // Only include way creates or modifies
    for (var i = 0; i < data.length; i++) {
        if (data[i].neu.type === 'way' && data[i].type !== 'delete') {
            filteredChanges.push(data[i]);
           // console.log("Took this data (type = "+ data[i].neu.type +"): " + JSON.stringify(data[i].neu));
        }
        else
        {
        	//console.log("Did not take this data (type = "+ data[i].neu.type +"): " + JSON.stringify(data[i].neu));
        }
    }

    // Sort by "interestingness". For now just the number of ways?
    // Only pick the 30 most interestin changes so we can spend 2 seconds on each change
    filteredChanges = filteredChanges.sort(function(a, b) {
            return b.neu.linestring.length - a.neu.linestring.length;
        }).slice(0, changesToShowEveryMinute),
        millisPerChange = (60000 / (filteredChanges.length + 1) ), // add one, as the first call will happen after a millisPerChange milliseconds
        wayAddInterval = setInterval(function() {
            var nextChange = filteredChanges.pop();
            //console.log("Called, wayAddInterval was: " + wayAddInterval + ", nextchange was: " + JSON.stringify(nextChange) );

            if (paused) return;

            if (nextChange === null || nextChange === undefined ) {
                clearInterval(wayAddInterval);
            } else {
                drawLineChange(nextChange);
            }
        }, millisPerChange);
});

var oldLine = L.polyline([], { opacity: 0.3}).addTo(map),
    newLine = L.polyline([], { opacity: 1, color: '#FF0099' }).addTo(map);

function urlUser(_) {
    return 'http://osm.org/user/' + _;
}

function urlWay(type, id) {
    return 'http://osm.org/browse/' + type + '/' + id;
}

function drawLineChange(change) {
    // Zoom to the area in question
    var bounds = new L.LatLngBounds(
        new L.LatLng(change.neu.bounds[2], change.neu.bounds[3]),
        new L.LatLng(change.neu.bounds[0], change.neu.bounds[1]));

    map.fitBounds(bounds);
    overview_map.panTo(bounds.getCenter());

    // Remove the previous lines, if any
    oldLine.setLatLngs([]);
    newLine.setLatLngs([]);

    // Show information about the change
    var change_html = '<p><a class="icon-user" href="' + urlUser(change.neu.user) + '">' + change.neu.user + '</a>' +
        ' added way <a href="' + urlWay(change.neu.type, change.neu.id) + '">' + change.neu.id + '</a>' +
        ' in changeset <a href="http://osm.org/browse/changeset/' + change.neu.changeset + '">' + change.neu.changeset + '</a>.</p><br/><p>';
    for (var k in change.neu.tags) {
        change_html += '<span class="tag_key">' + k + '</span>=<span class="tag_value">' + change.neu.tags[k] + '</span><br/>';
    }
    change_html += '</p>';
    document.getElementById('changeset_info').innerHTML = change_html;

    // Draw the old way in the background
    if ('old' in change) {
        oldLine.setLatLngs(change.old.linestring);
    }

    // Draw the new way in 1.5 seconds, node by node
    var millisPerChange = 1500;
    var nodeAddInterval = setInterval(function() {
        var nextPoint = change.neu.linestring.pop();
        if (nextPoint === undefined) {
            clearInterval(nodeAddInterval);
        } else {
            newLine.addLatLng(nextPoint);
        }
    }, (millisPerChange / change.neu.linestring.length));
}

function togglePause() {
    paused = !paused;
    // TODO Stop and start the osmstream?
    if (paused) {
        document.getElementById('pause_button').innerHTML = "Continue";
    } else {
        document.getElementById('pause_button').innerHTML = "Pause";
    }
}
