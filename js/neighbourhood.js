/**
 * Created by rafaeltikva on 29/03/16.
 */

var neighbourhood = neighbourhood || {};

neighbourhood.initMap = function () {

    var defaultLocation = new google.maps.LatLng(31.3968626, 32.8371719);

    // create initial map, set Markers Options etc'
    neighbourhood.initSettings(defaultLocation);

    // try asking for the user for his geolocation
    neighbourhood.tryGeoLocation();

    // add some markers to the map
    //neighbourhood.addMarkersToMap(defaultSettings.markers);

};

neighbourhood.initSettings = function (location) {

    this.map = this.map || new google.maps.Map($('#map')[0], {
        center: location,
        zoom: 7,
        rotateControl: true,
        fullScreenControl: true,
        scaleControl: true
    });

    // Initialize lat lng object
    neighbourhood.position = location;

    // Initialize infoWindow
    neighbourhood.infoWindow = new google.maps.InfoWindow({map: neighbourhood.map});

    // Set up Google Places Autocomplete
    neighbourhood.initAutoComplete();

    return {
        map: this.map,
        markers: [
            {
                map: map,
                position: new google.maps.LatLng(31.983454, 34.7690243),
                animation: google.maps.Animation.DROP
            },
            {
                map: map,
                position: new google.maps.LatLng(31.9889412, 34.772082),
                animation: google.maps.Animation.DROP
            },
            {
                map: map,
                position: new google.maps.LatLng(31.9883326, 34.7722573),
                animation: google.maps.Animation.DROP
            },
        ]
    }
};

neighbourhood.initObservables = function () {
    neighbourhood.markerObjects = ko.observableArray();
    neighbourhood.searchInput = ko.observable('');
};

neighbourhood.tryGeoLocation = function () {

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            neighbourhood.position = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // get reverse geocode
            neighbourhood.getGeoCode({'location': neighbourhood.position}, true);

        }, function () {
            neighbourhood.handlers.handleLocationError(true);
        }, {timeout: 15000});
    }
    else {
        neighbourhood.handlers.handleLocationError(false);
    }

};

neighbourhood.addMarkerToMap = function (markerOptions) {

    var markerObj = {};

    markerObj.marker = new google.maps.Marker(markerOptions);

    if (!_.isEmpty(markerOptions.custom)) {
        markerObj.custom = markerOptions.custom;

        if (!_.isEmpty(markerObj.custom.markerEvents)) {

            // Add event listeners
            for (event in markerObj.custom.markerEvents) {
                markerObj.marker.addListener(event, markerObj.custom.markerEvents[event](markerObj));
            }
        }
    }

    return markerObj;
};

neighbourhood.addMarkersToMap = function (markers) {
    var markerObjects = [];
    for (var i = 0; i < markers.length; i++) {

        var markerOptions = markers[i];

        markerObjects.push(neighbourhood.addMarkerToMap(markerOptions));
    }

    return markerObjects;
};


neighbourhood.getGeoCode = function (geocoderOptions, includeNearbyPlaces) {

    var geoCoder = new google.maps.Geocoder();

    geoCoder.geocode(geocoderOptions, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {

            if (results.length) {
                console.log(results); // all the results

                // set map to geolocation position
                neighbourhood.map.panTo(geocoderOptions.location);
                neighbourhood.map.setZoom(16);

                // set infoWindow to geolocation position
                neighbourhood.infoWindow.setPosition(geocoderOptions.location);

                // get the exact address/place name
                var address = results[0].formatted_address;

                // set info window content
                neighbourhood.helpers.setInfoWindowContent(address);

                // add custom css styles to infowindow container
                //neighbourhood.helpers.styleInfoWindow('info-window');


                neighbourhood.foundMarkerObj = neighbourhood.addMarkerToMap({
                    anchorPoint: new google.maps.Point(0, 10),
                    position: geocoderOptions.location,
                    map: neighbourhood.map,
                    title: address,
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    custom: {
                        markerEvents: {
                            click: neighbourhood.handlers.markerClick,
                            rightclick: neighbourhood.handlers.markerClick
                        }
                    }
                });
                neighbourhood.markerObjects.push(neighbourhood.foundMarkerObj);

                if (includeNearbyPlaces) {
                    neighbourhood.getNearbyPlaces({
                        'location': geocoderOptions.location,
                        'radius': 1000,
                        'types': ['establishment']
                    });
                }

                neighbourhood.setAutoComplete();

            }

            else {
                alert('No results found');
            }
        }

        else {
            alert('Geocoder failed: ' + status);
        }
    });
};

neighbourhood.getNearbyPlaces = function (searchOptions) {
    var service = new google.maps.places.PlacesService(neighbourhood.map);
    service.nearbySearch(searchOptions, function (results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {

            var markers = [];

            for (var i = 0; i < results.length; i++) {
                var place = results[i];
                console.log(place);

                // define markers
                markers.push({
                    map: neighbourhood.map,
                    title: place.name,
                    place: {
                        location: place.geometry.location,
                        placeId: place.place_id
                    },
                    icon: {
                        url: place.icon,
                        scaledSize: new google.maps.Size(30, 30)
                    },
                    custom: {
                        markerEvents: {
                            click: neighbourhood.handlers.markerClick,
                            rightclick: neighbourhood.handlers.markerClick
                        },
                        customContent: {
                            photo: (place.hasOwnProperty('photos')) ? place.photos[0].getUrl({
                                maxWidth: 150,
                                maxHeight: 150
                            }) : ''
                        }
                    }
                });

            }
            // add markers to map and list
            neighbourhood.markerObjects(neighbourhood.addMarkersToMap(markers));
        }
    });

};

neighbourhood.initAutoComplete = function () {

    this.autoComplete = new google.maps.places.Autocomplete($('input#search-input')[0], {
        'types': ['establishment']
    });

    this.autoComplete.addListener('place_changed', neighbourhood.handlers.onPlaceChanged);
};

neighbourhood.setAutoComplete = function () {

    var circle = new google.maps.Circle({
        center: neighbourhood.position,
        radius: 1000 // TODO make the radius configurable (use the same radius parameter as nearbyPlaces)
    });

    this.autoComplete.setBounds(circle.getBounds());

};

neighbourhood.handlers = {
    handleLocationError: function (browserHasGeoLocation) {
        neighbourhood.infoWindow.setPosition(neighbourhood.position);
        neighbourhood.infoWindow.setContent(browserHasGeoLocation ?
                'Error: The Geolocation service failed.' :
                'Error: Your browser doesn\'t support geolocation.'
        );

    },

    markerClick: function (markerObj) {

        markerObj.custom = markerObj.custom || {};

        return function (event) {

            // show infoWindow
            neighbourhood.infoWindow.open(markerObj.marker.getMap(), markerObj.marker);
            neighbourhood.helpers.setInfoWindowContent(markerObj.marker.getTitle(), markerObj.custom.customContent)

            if (markerObj.marker.getAnimation() !== null) {
                markerObj.marker.setAnimation(null)
            }
            else {
                markerObj.marker.setAnimation(google.maps.Animation.BOUNCE);
            }
        }

    },
    onPlaceChanged: function () {
        var place = neighbourhood.autoComplete.getPlace();
        if (place.geometry) {
            neighbourhood.position = place.geometry.location;
            neighbourhood.map.panTo(neighbourhood.position);
            neighbourhood.map.setZoom(16);

            neighbourhood.infoWindow.setPosition(neighbourhood.position);
            neighbourhood.helpers.setInfoWindowContent(place.name);

            neighbourhood.helpers.removeMarkers();
            neighbourhood.helpers.clearSearchInput();

            neighbourhood.foundMarkerObj = neighbourhood.addMarkerToMap({
                anchorPoint: new google.maps.Point(0, 10),
                position: neighbourhood.position,
                map: neighbourhood.map,
                title: place.name,
                draggable: true,
                animation: google.maps.Animation.DROP,
                custom: {
                    markerEvents: {
                        click: neighbourhood.handlers.markerClick,
                        rightclick: neighbourhood.handlers.markerClick
                    }
                }
            });

            neighbourhood.markerObjects.push(neighbourhood.foundMarkerObj);

            neighbourhood.getNearbyPlaces({
                'location': neighbourhood.position,
                'radius': 1000,
                'types': ['establishment']
            });

            neighbourhood.setAutoComplete();
        }
    }

};

neighbourhood.helpers = {
    styleInfoWindow: function (infoWindowId) {
        $('#' + infoWindowId).closest('.gm-style-iw').parent().css({
            'margin-top': '-50px'
        });
    },


    sanitizeMarker: function (markerOptions) {

        var strippedOptions = (!_.isEmpty(markerOptions.custom)) ? markerOptions.custom : {};

        // strip out custom content before initializing the marker
        delete markerOptions.custom;

        // return the deleted options before initializing the marker
        return strippedOptions;

    },

    showMarker: function (marker) {

        if (marker.title.toLocaleLowerCase().indexOf(neighbourhood.searchInput().toLocaleLowerCase()) > -1) {
            marker.setVisible(true);
            return true;
        }
        else {
            marker.setVisible(false);
            return false;
        }
    },

    removeMarkers: function () {

        for (var i = 0; i < neighbourhood.markerObjects().length; i++) {
            neighbourhood.markerObjects()[i].marker.setMap(null);
        }

        neighbourhood.foundMarkerObj.marker.setMap(null);

        // delete marker objects from observableArray
        neighbourhood.markerObjects.removeAll();

    },

    clearSearchInput: function () {
        // clear search input
        neighbourhood.searchInput('');

    },

    setInfoWindowContent: function (content, customContent) {

        var customImage = '';

        if (!_.isEmpty(customContent)) {
            if (customContent.photo) {
                customImage = '<img class="place-img" src="' + customContent.photo + '" />';
            }
        }
        neighbourhood.infoWindow.setContent('<div class="info-window"><div class="info-window-text">' + content + '</div>' + customImage + '</div>');
    }

};

// initialize observables
neighbourhood.initObservables();


// Bind ViewModel to View

ko.applyBindings(neighbourhood);