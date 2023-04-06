//Time-series assessments

//Spatial  setup

var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[86.18026027669731, 25.3984830907839],
          [86.18026027669731, 25.247040260866658],
          [86.41646633138481, 25.247040260866658],
          [86.41646633138481, 25.3984830907839]]], null, false),
    geometry2 = /* color: #98ff00 */ee.Geometry.Point([86.29449220446129, 25.333288764282408]);

//define/import two gemotery - (a) geometry for AOI, (b) geometry for point to plot the MNDWI TS
var AOI = geometry; //could be a table assest too
var point = geometry2
//var point = ee.Geometry.Point(79.106667,26.083333); //point can also defined by this way (long, lat)

Map.addLayer(AOI, {color: 'blue'}, 'AOI', false);
Map.centerObject(geometry, 9);

//temporal bounds setup
var startDate = '2021-01-01';
var endDate = '2022-12-31';

//seasonal bounds setup
var startYear = ee.Date(startDate).get('year');
var endYear = ee.Date(endDate).get('year');

var startMonth = 9;
var endMonth = 11; //this month should be in endDate

var startDay = 1;
var endDay = 30;

//Define a colour palette uisng HEX codes
var blue_shades = ['accbff','92bbff','78aaff','649eff','4188ff'];

// Standardise band names
var bands_L8 = ['B1', 'B2', 'B3', 'B4', 'B6', 'pixel_qa', 'B5', 'B7'];
var bands_Ls = ['uBlue', 'Blue', 'Green', 'Red', 'Swir1', 'BQA', 'Nir', 'Swir2'];

//Get image collection of Landsat 8
var L8_raw = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR").select(bands_L8, bands_Ls)
            .filterDate(startDate, endDate)
            //.filter(ee.Filter.calendarRange(startMonth, endMonth, 'month')) //seasonal filter
            .filterBounds(AOI) //spatial filter
            ;

// Cloud masking function
var maskcloud = function(image) {
                    var cloudShadowBitMask = 1 << 3; 
                    var cloudsBitMask = 1 << 5; 
                    var qa = image.select('BQA'); 
                    var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0) 
                                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0)); 
                    return image.updateMask(mask).multiply(0.0001).clip(AOI)
                        .set('system:time_start', image.get('system:time_start'));
                    }; 
//Learn more about bit-wise masking at:
//https://gis.stackexchange.com/questions/405056/understanding-the-cloud-mask-in-google-earth-engine


var L8 = L8_raw.map(maskcloud)
                 .select(['Blue', 'Green', 'Red', 'Swir1', 
                 'Nir', 'Swir2']);
                 
                 
//Visualise median of all data in False-Colour-Composite

var bands50 = ['Nir', 'Red','Green'];
var percentile50 = L8.reduce(ee.Reducer.percentile([50]))
    .select('Nir_p50', 'Red_p50', 'Green_p50')
    .clip(AOI);
    
var params_fcc_colour = {
  region: AOI, 
  min: 0.0, max: 0.3, 
  bands: ["Nir_p50", "Red_p50", "Green_p50"], 
  };

Map.addLayer(percentile50.clip(AOI), params_fcc_colour, 'FCC (NIR-R-G)', false);

//function to calculate MNDWI 
var addMNDWI = function(image) {
  var mndwi = image.normalizedDifference(['Green', 'Swir1'])
  .rename('MNDWI');
  return image.addBands(mndwi);
};

//function to add time
// Convert milliseconds from epoch to years to aid in
    // interpretation of the following trend calculation.
var createTimeBand = function(image) {
  return     image.addBands(image.metadata('system:time_start')
  .divide(1000 * 60 * 60 * 24 * 365)
  .copyProperties(image, image.propertyNames()));
};

//map MNDWI and time functions on collection
var withMNDWI = L8.map(addMNDWI).map(createTimeBand);

print(withMNDWI)

//Get MNDWIs
var mndwi_med = withMNDWI.select('MNDWI').reduce(ee.Reducer.median()); 

var mndwi_max = withMNDWI.select('MNDWI').reduce(ee.Reducer.max()); 

Map.addLayer(mndwi_med.updateMask(mndwi_med.gt(0)),
            {min: 0, max:1, palette: blue_shades},
              'MedianMNDWI',false);
Map.addLayer(mndwi_max.updateMask(mndwi_max.gt(0)),
            {min: 0, max:1, palette: blue_shades},
            'MaxMNDWI',false);
            

//plot for a point
var chart = ui.Chart.image.series({
    imageCollection: withMNDWI.select(['MNDWI']),
    region: point,
    scale: 30
    }).setOptions({
      interpolateNulls: true,
      lineWidth: 1,
      pointSize: 3,
      bestEffort: true,
      maxPixels: 1e12,
      scale: 30,
      title: 'MNDWI',
      vAxis: {title: 'MNDWI'},
      hAxis: {title: 'Year', format: 'yyyy-MM'},
      trendlines: {
        type: 'linear', 
        0: {color: 'CC0000'},
        showR2: true, 
        pointsVisible: false, 
        visibleInLegend: true
        
      }

    });
    
print(chart);

//Calculate pixel-scale wetness trend by linear regression
var linearFit = withMNDWI.select(['system:time_start','MNDWI'])
.reduce(ee.Reducer.linearFit());

//linpar sets decreasing (-ve) trend at red, incr. at green. linearFit 
//above gives slope (scale) and intercept (offset) bands
var linpar = {min: 0, max: [-0.01, 0.01, 5], bands: ['scale', 'scale', 'offset']};
Map.addLayer(linearFit, linpar,'wet_trend', false);

// //to export all MNDWI data 
// var MNDWI = withMNDWI.select(['MNDWI']);
// var N = MNDWI.size().getInfo();
// //List MNDWI
// var list=MNDWI.toList(N);
//     for (var i=0;i<N;i++){
//         var img=ee.Image(list.get(i));
//         var date = img.date().format('yyyy-MM-dd').getInfo()
//         var names= 'MNDWI_'+date
//         print(names);
//     // Export MNDWI        
//         Export.image.toDrive({ 
//               image: img,
//               description: names,
//               fileNamePrefix: names,
//               scale: 300,
//               region:AOI,
//               folder: 'GEE'
               
//               });
//     }