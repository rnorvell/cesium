/*global defineSuite*/
defineSuite([
         'Scene/GoogleEarthImageryProvider',
         'Core/defined',
         'Core/DefaultProxy',
         'Core/FeatureDetection',
         'Core/loadImage',
         'Core/loadWithXhr',
         'Core/Extent',
         'Scene/Imagery',
         'Scene/ImageryLayer',
         'Scene/ImageryProvider',
         'Scene/ImageryState',
         'Scene/NeverTileDiscardPolicy',
         'Scene/WebMercatorTilingScheme',
         'Scene/GeographicTilingScheme',
         'ThirdParty/when'
     ], function(
         GoogleEarthImageryProvider,
         defined,
         DefaultProxy,
         FeatureDetection,
         loadImage,
         loadWithXhr,
         Extent,
         Imagery,
         ImageryLayer,
         ImageryProvider,
         ImageryState,
         NeverTileDiscardPolicy,
         WebMercatorTilingScheme,
         GeographicTilingScheme,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('constructor throws when url is not specified', function() {
        function constructWithoutServer() {
            return new GoogleEarthImageryProvider({
                channel: 1234
            });
        }
        expect(constructWithoutServer).toThrow();
    });

    it('constructor throws when channel is not specified', function() {
        function constructWithoutChannel() {
            return new GoogleEarthImageryProvider({
                url: 'http://invalid.localhost'
            });
        }
        expect(constructWithoutChannel).toThrow();
    });

    it('can provide a root tile', function() {
        var path = '';
        var url = 'http://example.invalid';
        var channel = 1234;
        var version = 1;

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel: channel,
            path: path
        });

        expect(provider.getUrl()).toEqual(url);
        expect(provider.getPath()).toEqual(path);
        expect(provider.getChannel()).toEqual(channel);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            expect(provider.getTileWidth()).toEqual(256);
            expect(provider.getTileHeight()).toEqual(256);
            expect(provider.getMaximumLevel()).toEqual(23);
            expect(provider.getMinimumLevel()).toEqual(0);
            expect(provider.getVersion()).toEqual(version);
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getTileDiscardPolicy()).toBeUndefined();
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().getExtent());
        });

        waitsFor(function() {
            return defined(provider.getCredit());
        }, 'logo to become ready');

        runs(function() {
            expect(provider.getCredit()).toBeInstanceOf(Object);

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if(url.indexOf('blob:') !== 0) {
                  expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
                expect(url).toEqual('http://example.invalid/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1');

                // Just return any old image.
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('handles malformed JSON data returned by the server', function() {
        var path = '/default_map';
        var url = 'http://example.invalid';
        var version = 1;
        var channel = 1234;

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return deferred.resolve('{\n' +
                'isAuthenticated: true,\n' +
                'layers: [\n' +
                '   {\n' +
                '        icon: "icons/773_l.png",\n' +
                '        id: 1234,\n' +
                '        initialState: true,\n' +
                '        label: "Imagery",\n' +
                '        lookAt: "none",\n' +
                '        requestType: "ImageryMaps",\n' +
                '        version: 1\n' +
                '    },{\n' +
                '        icon: "icons/773_l.png",\n' +
                '        id: 1007,\n' +
                '        initialState: true,\n' +
                '        label: "Labels",\n' +
                '        lookAt: "none",\n' +
                '        requestType: "VectorMapsRaster",\n' +
                '        version: 8\n' +
                '    }\n' +
                '],\n' +
                'serverUrl: "https://example.invalid",\n' +
                'useGoogleLayers: false\n' +
            '}');
        };

        var provider = new GoogleEarthImageryProvider({
            url : url,
            channel: channel
        });

        expect(provider.getUrl()).toEqual(url);
        expect(provider.getPath()).toEqual(path);
        expect(provider.getVersion()).toEqual(version);
        expect(provider.getChannel()).toEqual(channel);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');
    });

    it('routes requests through a proxy if one is specified', function() {
        var path = '/default_map';
        var url = 'http://example.invalid';
        var proxy = new DefaultProxy('/proxy/');

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url: url,
            channel: 1234,
            proxy : proxy
        });

        expect(provider.getUrl()).toEqual(url);
        expect(provider.getPath()).toEqual(path);
        expect(provider.getProxy()).toEqual(proxy);

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var tile000Image;

        runs(function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                if(url.indexOf('blob:') !== 0) {
                  expect(url).toEqual(proxy.getURL('http://example.invalid/default_map/query?request=ImageryMaps&channel=1234&version=1&x=0&y=0&z=1'));
                }

                // Just return any old image.
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            when(provider.requestImage(0, 0, 0), function(image) {
                tile000Image = image;
            });
        });

        waitsFor(function() {
            return defined(tile000Image);
        }, 'requested tile to be loaded');

        runs(function() {
            expect(tile000Image).toBeInstanceOf(Image);
        });
    });

    it('raises error on invalid url', function() {
        var url = 'invalid.localhost';
        var provider = new GoogleEarthImageryProvider({
            url: url,
            channel: 1234
        });

        var errorEventRaised = false;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf(url) >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.isReady() || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error event when image cannot be loaded', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/good.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'example.invalid',
            channel: 1234
        });

        var layer = new ImageryLayer(provider);

        var tries = 0;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.timesRetried).toEqual(tries);
            ++tries;
            if (tries < 3) {
                error.retry = true;
            }
        });

        loadImage.createImage = function(url, crossOrigin, deferred) {
            // Succeed after 2 tries
            if (url.indexOf('blob:') !== 0 && tries === 2) {
                // valid URL
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            }

            // invalid URL
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
        };

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            // Succeed after 2 tries
            if (tries === 2) {
                // valid URL
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            }

            // invalid URL
            return loadWithXhr.defaultLoad(url, responseType, method, data, headers, deferred);
        };

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        var imagery;
        runs(function() {
            imagery = new Imagery(layer, 0, 0, 0);
            imagery.addReference();
            layer._requestImagery(imagery);
        });

        waitsFor(function() {
            return imagery.state === ImageryState.RECEIVED;
        }, 'image to load');

        runs(function() {
            expect(imagery.image).toBeInstanceOf(Image);
            expect(tries).toEqual(2);
            imagery.releaseReference();
        });
    });

    it('defaults to WebMercatorTilingScheme when no projection specified', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated": true,
                "layers": [
                    {
                        "icon": "icons/773_l.png",
                        "id": 1234,
                        "initialState": true,
                        "label": "Imagery",
                        "requestType": "ImageryMaps",
                        "version": 1
                    }
                ],
                "serverUrl": "https://example.invalid",
                "useGoogleLayers": false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://example.invalid',
            channel: 1234
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().getExtent());
        });
    });

    it('Projection is WebMercatorTilingScheme when server projection is mercator', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated": true,
                "layers": [
                    {
                        "icon": "icons/773_l.png",
                        "id": 1234,
                        "initialState": true,
                        "label": "Imagery",
                        "requestType": "ImageryMaps",
                        "version": 1
                    }
                ],
                "projection": "mercator",
                "serverUrl": "https://example.invalid",
                "useGoogleLayers": false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://example.invalid',
            channel: 1234
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getTilingScheme()).toBeInstanceOf(WebMercatorTilingScheme);
            expect(provider.getExtent()).toEqual(new WebMercatorTilingScheme().getExtent());
        });
    });

    it('Projection is GeographicTilingScheme when server projection is flat', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return deferred.resolve(JSON.stringify({
                "isAuthenticated": true,
                "layers": [
                    {
                        "icon": "icons/773_l.png",
                        "id": 1234,
                        "initialState": true,
                        "label": "Imagery",
                        "requestType": "ImageryMaps",
                        "version": 1
                    }
                ],
                "projection": "flat",
                "serverUrl": "https://example.invalid",
                "useGoogleLayers": false
            }));
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://example.invalid',
            channel: 1234
        });

        waitsFor(function() {
            return provider.isReady();
        }, 'imagery provider to become ready');

        runs(function() {
            expect(provider.getTilingScheme()).toBeInstanceOf(GeographicTilingScheme);
            expect(provider.getExtent()).toEqual(new Extent(-Math.PI, -Math.PI, Math.PI, Math.PI));
        });
    });

    it('raises error when channel cannot be found', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_channel.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://invalid.localhost',
            channel: 1235
        });

        var errorEventRaised = false;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf('Could not find layer with channel') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.isReady() || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error when channel version cannot be found', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_version.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://invalid.localhost',
            channel: 1234
        });

        var errorEventRaised = false;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf('Could not find a version in channel') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.isReady() || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });

    it('raises error when unsupported projection is specified', function() {
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred) {
            return loadWithXhr.defaultLoad('Data/GoogleEarthImageryProvider/bad_projection.json', responseType, method, data, headers, deferred);
        };

        var provider = new GoogleEarthImageryProvider({
            url: 'http://invalid.localhost',
            channel: 1234
        });

        var errorEventRaised = false;
        provider.getErrorEvent().addEventListener(function(error) {
            expect(error.message.indexOf('Unsupported projection') >= 0).toEqual(true);
            errorEventRaised = true;
        });

        waitsFor(function() {
            return provider.isReady() || errorEventRaised;
        }, 'imagery provider to become ready or raise error event');

        runs(function() {
            expect(provider.isReady()).toEqual(false);
            expect(errorEventRaised).toEqual(true);
        });
    });
});
