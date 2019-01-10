// ---- define GroundGeometry class ----
// ~ disclaimer on the coordinate system
// ~ 1 metre corresponds to 1 'three.js coordinate system length'
// ~ x axis: - => west, + => east
// ~ y axis: - => south, + => north
// ~ z axis: - => down, + => up
class GroundGeometry extends THREE.PlaneBufferGeometry {
    constructor(latIdx, longIdx, camera) { // both are floored lat, long
        // ---- call super ----
        super(1, 1, 1200, 1200);

        // ---- set camera for update ----
        this.camera = camera

        // ---- transform vertices to accurately depict earth's surface ----
        // ~ the final vertices map will 'look' trapezoidal.
        // ~ h: height
        // ~ the earth's shape is assumed to be completely spherical,
        // ~ and the radius is 6371km = 6371000m.
        this.latIdx = latIdx;
        this.longIdx = longIdx;
        this.R = 6371000.0;
        var h = 2 * Math.PI * this.R / 360;

        var vertices = this.attributes.position.array;

        for(var i=0; i < 1201 * 1201; i++) {
            // recover x and y coordinates in datamap
            var x = i % 1201;
            var y = (i - x) / 1201;
            // calculate constants
            var latRemainder = 1 - (y / 1201);
            var width = this.longToM(1, latIdx + latRemainder);
            this.height = h;
            // map the vertex
            vertices[3*i] *= width;
            vertices[3*i + 1] *= this.height;
        }
        
        // ---- run xhr ----
        // ready flag
        this.ready = false;

        // construct height datamap request url string
        var reqStrLat = (latIdx > 0 ? "N" : "S") + latIdx.toString();
        var reqStrLong = (longIdx > 0 ? "E" : "W") + longIdx.toString();
        var reqStr = "https://s3.ap-northeast-2.amazonaws.com/kiwiprojcdn/elvdata/" + reqStrLat + reqStrLong + ".hgt";
        // make xhr
        var req = new XMLHttpRequest();
        req.open("GET", reqStr);
        req.responseType = "arraybuffer";

        // ---- generate ground geometry ----
        var neighbor = [
            [-1, 1], // SE
            [-1, 0], // S
            [-1, -1], // SW
            [0, 1], // E
            [0, -1], // W
            [1, 1], // NE
            [1, 0], // N
            [1, -1] // NW
        ]

        var importElevationData = function() {
            var buffer = req.response;

            if(buffer) {
                var dataArr = new Uint8ClampedArray(buffer);
                var voidArr = [];

                for(var i = 0; i < dataArr.byteLength/2; i++) { // read elevation data bytewise                    var elevation = 256*dataArr[2*i] + dataArr[2*i + 1]; // retrieve height data from byte array
                    var elevation = 256*dataArr[2*i] + dataArr[2*i + 1]; // retrieve height data from byte array
                    if(elevation > 10000) { // since the data seems to struggle with handling negative numbers, manual adjustments are mandatory
                        if(dataArr[2*i] == 128 && dataArr[2*i + 1] == 0) { // if the given data is a void data
                            voidArr.push(i); // save for postprocessing
                            console.log(elevation);
                        } else {
                            elevation -= 256 * 256;
                        }
                    }
                    vertices[3*i + 2] = elevation;
                }

                var checkVoid = function() { // check for void datas
                    voidArr = [];

                    for(var i = 0; i < vertices.length/3; i++) {
                        var elevation = vertices[3*i + 2];
                        if(elevation > 10000) {
                            voidArr.push(i);
                        }
                    }
                }

                var fillVoid = function() { // fill void datas
                    for(var i = 0; i < voidArr.length; i++) {  // for 'void' datas, calculate the mean elevation of the neighbors and set that as the elevation
                        var voidIdx = voidArr[i];
                        var voidX = voidIdx % 1201;
                        var voidY = Math.floor(voidIdx / 1201);

                        var elevationSum = 0;
                        var num = 0;
                        
                        for(var j = 0; j < neighbor.length; j++) {
                            var modX = voidX + neighbor[j][1];
                            var modY = voidY + neighbor[j][0];
                            var modIdx = modY * 1201 + modX;
                            
                            var isXOutofbounds = modX < 0 || modX > 1200;
                            var isYOutofbounds = modY < 0 || modY > 1200;

                            if(!isXOutofbounds && !isYOutofbounds) { // the calculated neighbor is not out of bounds
                                if(vertices[3*modIdx + 2] < 10000) { // the calculated neighbor is not a void data
                                    elevationSum += vertices[3*modIdx + 2];
                                    num += 1;
                                }
                            }
                        }

                        if(num != 0) {
                            vertices[3*voidIdx + 2] = elevationSum / num;
                        }
                    }
                }

                fillVoid();
                checkVoid(); // repeat in case of 'nested void data'
                fillVoid();

                this.attributes.position.needsUpdate = true;
                this.attributes.normal.needsUpdate = true;
                this.attributes.uv.needsUpdate = true;

                this.computeFaceNormals();
                this.computeVertexNormals();
                this.computeBoundingSphere();
                this.computeBoundingBox();

                this.camera.setGroundGeometry(this); // set camera's geometry

                //console.log(this.attributes.position.array);

                this.ready = true;

                console.log("Successfully retrieved data!");
            } else {
                console.log("There was a faliure while reading height data map. (index.html: line 134)");
            }
        }

        // ---- resume xhr ----
        req.onload = importElevationData.bind(this);
        req.send(null);
    }

    longToM(longDeg, atLat) { // convert degree-length longDeg to m at latitude atLat
        var r = this.R * Math.cos(Math.radians(Math.abs(atLat))); // radius of cross-section circle
        var c = 2 * Math.PI * r; // circumference of the cross-section
        var l = c / 360 * longDeg; // calculated m
        return l;
    }

    latlongToCoord(lat, long) { // convert lat,long to coordinates in three.js world
        if(Math.floor(lat) != this.latIdx || Math.floor(long) != this.longIdx) {throw "out of bounds!"; return;} // if latlong is out of bounds
        var latRemainder = lat - this.latIdx - 1/2; // -0.5 ~ 0.5
        var longRemainder = long - this.longIdx - 1/2; // -0.5 ~ 0.5
        var longMult = this.longToM(1, lat); // the map's width

        var x = longRemainder * longMult;
        var y = latRemainder * this.height;
        return [x, y];
    }

    coordToLatlong(x, y) { // convert x,y to latlong
        var latRemainder = y / this.height;
        var lat = latRemainder + 1/2 + this.latIdx;

        var longMult = this.longToM(1, lat); // the map's width
        var longRemainder = x / longMult;
        var long = longRemainder + 1/2 + this.longIdx;
        return [lat, long];
    }
}