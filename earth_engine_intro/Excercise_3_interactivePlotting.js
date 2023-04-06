var geometry = ee.FeatureCollection("users/manudeo_singh/Ganga_Basin"),
    geometry2 = /* color: #23cba7 */ee.Geometry.Point([81.5729391460063, 26.132605350428577]);

Map.centerObject(geometry, 6);
//temporal bounds setup
var startDate = '1999-01-01';
var endDate = '2021-12-31';

////////////////////
///GPM Dataset///
////////////////////

var dataset = ee.ImageCollection('NASA/GPM_L3/IMERG_MONTHLY_V06')
    .filterDate(startDate, endDate)
    //.filter(ee.Filter.calendarRange(startMonth, endMonth, 'month')) //seasonal filter
    .filterBounds(geometry);

// Select the max precipitation and mask out low precipitation values.
var precipitation = dataset.select('precipitation').max();
var mask = precipitation.gt(0.25);
var precipitation = precipitation.updateMask(mask);

var palette = [ 
  '000096','0064ff', '00b4ff', '33db80', '9beb4a',
  'ffeb00', 'ffb300', 'ff6400', 'eb1e00', 'af0000'
];
var precipitationVis = {min: 0.0, max: 1.5, palette: palette};
Map.addLayer(precipitation.clip(geometry), precipitationVis, 'Precipitation', true);

//function to add time band
// Convert milliseconds from epoch to years to aid in
    // interpretation of the following trend calculation.
var createTimeBand = function(image) {
  return     image.addBands(image.metadata('system:time_start')
  .divide(1000 * 60 * 60 * 24 * 365)
  .copyProperties(image, image.propertyNames()));
};
//map time functions on collection
var RF_time_series = dataset.map(createTimeBand);

//////////////////////////////

var drawingTools = Map.drawingTools();
drawingTools.setShown(false);
while (drawingTools.layers().length() > 0) {
  var layer = drawingTools.layers().get(0);
  drawingTools.layers().remove(layer);
}
var dummyGeometry =
    ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '23cba7'});

drawingTools.layers().add(dummyGeometry);
function clearGeometry() {
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}
function drawRectangle() {
  clearGeometry();
  drawingTools.setShape('rectangle');
  drawingTools.draw();
}

function drawPolygon() {
  clearGeometry();
  drawingTools.setShape('polygon');
  drawingTools.draw();
}

function drawPoint() {
  clearGeometry();
  drawingTools.setShape('point');
  drawingTools.draw();
}
var chartPanel = ui.Panel({
  style:
      {height: '235px', width: '600px', position: 'bottom-right', shown: false}
});
Map.add(chartPanel);
function chartTimeSeries() {
  // Make the chart panel visible the first time a geometry is drawn.
  if (!chartPanel.style().get('shown')) {
    chartPanel.style().set('shown', true);
  }

  // Get the drawn geometry; it will define the reduction region.
  var aoi = drawingTools.layers().get(0).getEeObject();

  // Set the drawing mode back to null; turns drawing off.
  drawingTools.setShape(null);

  // Reduction scale is based on map scale to avoid memory/timeout errors.
  var mapScale = Map.getScale();
  var scale = mapScale > 5000 ? mapScale * 2 : 5000;

  // Chart time series for the selected area of interest.
  var chart = ui.Chart.image
                  .seriesByRegion({
                    imageCollection: RF_time_series,
                    regions: aoi,
                    reducer: ee.Reducer.mean(), //why???
                    band: 'precipitation',
                    scale: scale,
                    xProperty: 'system:time_start'
                  })
                  .setOptions({
                    titlePostion: 'none',
                    legend: {position: 'none'},
                    pointSize: 2,
                    title: 'GPM Monthly precipitation',
                    hAxis: {title: 'Date', format: 'YYYY-MM'},
                    vAxis: {title: 'Monthly precipitation (cm/hr)'},
                    series: {0: {color: '23cba7'}},
                    trendlines: {
                    type: 'linear', 
                    0: {color: 'CC0000'},
                    showR2: true, 
                    pointsVisible: false, 
                    visibleInLegend: true}
                  });

  // Replace the existing chart in the chart panel with the new chart.
  chartPanel.widgets().reset([chart]);
}
drawingTools.onDraw(ui.util.debounce(chartTimeSeries, 500));
drawingTools.onEdit(ui.util.debounce(chartTimeSeries, 500));
var symbol = {
  rectangle: '⬛',
  polygon: '🔺',
  point: '📍',
};
var controlPanel = ui.Panel({
  widgets: [
    ui.Label('1. Select a drawing mode.'),
    ui.Button({
      label: symbol.rectangle + ' Rectangle',
      onClick: drawRectangle,
      style: {stretch: 'horizontal'}
    }),
    ui.Button({
      label: symbol.polygon + ' Polygon',
      onClick: drawPolygon,
      style: {stretch: 'horizontal'}
    }),
    ui.Button({
      label: symbol.point + ' Point',
      onClick: drawPoint,
      style: {stretch: 'horizontal'}
    }),
    ui.Label('2. Draw a geometry.'),
    ui.Label('3. Wait for chart to render.'),
    ui.Label(
        '4. Repeat 1-3 or edit/move\ngeometry for a new chart.',
        {whiteSpace: 'pre'})
  ],
  style: {position: 'bottom-left'},
  layout: null,
});
Map.add(controlPanel);
