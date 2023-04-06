var geometry = 
    /* color: #98ff00 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[86.23237609863281, 25.887861958408127],
          [86.23237609863281, 25.08955042017363],
          [87.03437805175781, 25.08955042017363],
          [87.03437805175781, 25.887861958408127]]], null, false);

Map.centerObject(geometry, 9); //center and zoom to the AOI

//Date bounds
var startDate = '2022-10-01';
var endDate = '2022-11-15';

//Get satallite imageries collection for required dates and region 
  //and apply a simple cloud filter
  
var data= ee.ImageCollection('COPERNICUS/S2_SR')

//Date range
.filterDate(startDate,endDate)

//Area of Interest 
.filterBounds(geometry)

//Remove cloudy data (a simple cloud masking - NOT at pixel level)
.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20));

// OR, in a single line:
//var data= ee.ImageCollection('COPERNICUS/S2_SR').filterDate(startDate,endDate).filterBounds(geometry).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20));

//See the 'data'
print(data);

//Calculate median values of bands for given date range in the collection

//Introducing REDUCERs
var data_med = data.reduce(ee.Reducer.median()); 

var data_max = data.reduce(ee.Reducer.max()); 

print(data_med); //band names changes
print(data_max);


//Clip satellite imagery raster to AOI and visualise the FCC

var input_raster = data_med.clip(geometry);

var input_raster_max = data_max.clip(geometry);

Map.addLayer(input_raster, {                                          //Data
  bands: ['B8_median', 'B3_median', 'B4_median'], min: 500, max: 3500 //Visual. params. Q: Why these min-max?
}
  ,'FCC',  //Name the layer
  false);  //Default behaviour of the layer - show or not after running the code

//Calculate some indices

var green = input_raster.select('B3_median');
var nir = input_raster.select('B8_median')
var NDWI_1 = (
  (green.subtract(nir))
              .divide
  (green.add(nir))
            )

var NDWI= input_raster.normalizedDifference(['B3_median','B8_median']);
//var NDVI= input_raster.normalizedDifference(['B8_median','B4_median']);
//var NDTI= input_raster.normalizedDifference(['B4_median','B3_median']);

//Visualise indices
Map.addLayer(NDWI,{},'wetness', false);

//Get only wet areas (assumption: for wet areas, NDWI>0)
var wet = NDWI.updateMask(NDWI.gt(0)); //gt - greater than

//Visualise wet areas
Map.addLayer(wet,{
              min: 0, max: 1, palette: ['orange', 'green', 'blue']
                  },'wet-areas', false);

//Data download
//Export output to Google Drive
Export.image.toDrive({
  image: wet,
  description: 'WetAreaMedianNDWI_'+startDate+"and"+endDate,
  scale: 10,
  region: geometry,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

