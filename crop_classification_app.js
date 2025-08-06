// ------------------- GLOBAL SETTINGS -------------------
//var rawBands = ['B2','B3','B4','B8','B11'];
var rawBands = ['B2','B3','B4','B5','B6','B8','B11'];

//var computedBands = ['NDVI','EVI'];
var computedBands = ['NDVI', 'EVI', 'GNDVI', 'NDWI', 'SAVI'];

var allBands = rawBands.concat(computedBands);
var validClassCodes = [
  1, 5, 24, 3, 36, 4, 6, 21, 23, 28, 29, 30, 31, 42, 61, 66,
  2, 12, 13, 22, 32, 37, 38, 43, 44, 45, 46, 47, 48, 49
];
var classNames = [
  'Corn', 'Soybeans', 'Winter Wheat', 'Barley', 'Alfalfa', 'Rice', 'Sorghum',
  'Cotton', 'Peanuts', 'Oats', 'Rye', 'Millet', 'Speltz', 'Other Small Grains',
  'Fallow/Idle Cropland', 'Cherries',
  'Cottonwood', 'Sweet Corn', 'Popcorn', 'Tobacco', 'Sunflower',
  'Double Crop Wheat/Soybeans', 'Double Crop Corn/Soybeans',
  'Idle Grass', 'Grassland/Pasture', 'Hay', 'Herbs', 'Vetch', 'Misc Vegs'
];
var palette = [
  'yellow', 'green', 'orange', 'brown', 'purple', 'blue', 'red',
  'pink', 'saddlebrown', 'tan', 'lightgrey', 'cyan', 'plum', 'gray',
  'gold', 'crimson',
  'darkgreen', 'lime', 'olive', 'chocolate', 'navy',
  'teal', 'maroon', 'beige', 'peru', 'lightgreen', 'salmon', 'orchid', 'lightblue'
];

// ------------------- UI SETUP -------------------
var panel = ui.Panel({style:{width:'300px', fontFamily:'Open Sans'}});
ui.root.insert(0, panel);
panel.add(ui.Label({value:'Crop Classification Tool', style:{fontWeight:'bold', fontSize:'24px', color: '#327d14', margin: '10px auto'}}));

var states = ee.FeatureCollection('TIGER/2018/States');
var counties = ee.FeatureCollection('TIGER/2018/Counties');

var stateSelect = ui.Select({items: states.aggregate_array('NAME').getInfo(), placeholder:'Select State',
  style: {width: '80%',  margin: '5px auto'  }});
  panel.add(ui.Label({value:'State:', style: {
    fontWeight: '420',
    fontSize: '14px',
    color: '#547a61',
    margin: '20px 0 4px 8px'}})); 
panel.add(stateSelect);

var countyPanel = ui.Panel();
panel.add(ui.Label({value:'County:', style: {
    fontWeight: '420',
    fontSize: '14px',
    color: '#547a61',
    margin: '20px 0 4px 8px'}})); 
panel.add(countyPanel);
var countySelect = ui.Select({items:[], placeholder:'Select County',
  style: {width: '80%',  margin: '5px auto'  }});
countyPanel.add(countySelect);

var yearInput = ui.Textbox({placeholder:'Crop Year (2008–2024)', value:'2022',
  style: {width: '80%',  margin: '5px auto 20px auto'  }});
panel.add(ui.Label({value:'Crop Year:' , style: {
    fontWeight: '420',
    fontSize: '14px',
    color: '#547a61',
    margin: '20px 0 4px 8px'}})); 
panel.add(yearInput);

// -------------------ALL CLASSIFIERS COMPARISON CHECKBOX -------------------
var compareAllCheckbox = ui.Checkbox('Compare All Classifiers (Grid Search)', false);
panel.add(compareAllCheckbox);

// Disable classifierSelect if comparing all
compareAllCheckbox.onChange(function(checked) {
  classifierSelect.setDisabled(checked);
  advancedToggle.setDisabled(checked);   
  if (checked) {
    advancedToggle.setValue(false);     
    advancedPanel.style().set('shown', false);
  }
});


var classifierSelect = ui.Select({items:['Random Forest','CART','SVM'], value:'Random Forest',
  style: {width: '80%',  margin: '5px auto'  }});
panel.add(ui.Label({value:'Classifier:', style: {
    fontWeight: '420',
    fontSize: '14px',
    color: '#547a61',
    margin: '20px 0 4px 8px'}}))
; panel.add(classifierSelect);

// ------------------ ADVANCED SETTINGS PANEL ----------------------
var advancedPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {stretch: 'horizontal', margin:'8px', shown: false}});
var advancedToggle = ui.Checkbox('Show Advanced Settings', false);
panel.add(advancedToggle);
panel.add(advancedPanel);

// ---------------- UPDATE PANEL DYNAMICALLY ------------------
function updateAdvancedSettingsUI(type) {
  advancedPanel.clear();
  if (!advancedToggle.getValue()) return;

  // Create fresh inputs
  var numTreesInput = ui.Textbox({value: '50', placeholder: 'Number of Trees', style: {width: '75%', margin: 'auto 7px'}});
  var maxNodesInput = ui.Textbox({placeholder: 'Max Nodes (optional)', style: {width: '75%', margin: 'auto 7px'}});
  var minLeafInput = ui.Textbox({value: '1', placeholder: 'Min Leaf Population', style: {width: '75%', margin: 'auto 7px'}});
  var svmGammaInput = ui.Textbox({value: '0.5', placeholder: 'Gamma', style: {width: '75%', margin: 'auto 7px'}});
  var svmCostInput = ui.Textbox({value: '10', placeholder: 'Cost', style: {width: '75%', margin: 'auto 7px'}});

  // Store inputs globally
  currentInputs = {
    numTreesInput: numTreesInput,
    maxNodesInput: maxNodesInput,
    minLeafInput: minLeafInput,
    svmGammaInput: svmGammaInput,
    svmCostInput: svmCostInput
  };

  function makeParamRow(labelText, hintText, inputWidget) {
    var hintLabel = ui.Label('', {fontSize: '10px', color: 'gray', margin: '4px 0 4px 12px'});
    var showHint = false;

    var helpButton = ui.Button({
      label: '❓',
      style: {
        backgroundColor: 'white',
        border: '0.5px solid #ccc',
        fontSize: '14px',
        height: '26px',
        width: '18%',
        padding: '0',
        margin: '0 0 0 1px'
      }
    });

    helpButton.onClick(function () {
      showHint = !showHint;
      hintLabel.setValue(showHint ? hintText : '');
    });

    var inputRow = ui.Panel([inputWidget, helpButton], ui.Panel.Layout.Flow('horizontal'));

    advancedPanel.add(ui.Label(labelText, {
      color: '#547a61',
      fontSize: '13px',
      fontWeight: 'bold',
      margin: '8px'
    }));
    advancedPanel.add(inputRow);
    advancedPanel.add(hintLabel);
  }

  //Hints to be displayed
  if (type === 'Random Forest') {
    advancedPanel.add(ui.Label({
      value: 'Random Forest Parameters:', style: {
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#42614d',
        margin: '20px 0 4px 8px'
      }
    }));

    makeParamRow('Number of Trees:',
      'Specifies the number of decision trees in the forest. A larger number of trees generally increases model accuracy but also extends the computation time.',
      numTreesInput);

    makeParamRow('Max Nodes:',
      'Limits the maximum number of terminal nodes (leaves) in each tree. Lower values result in simpler trees, which can help prevent overfitting but may reduce predictive power.',
      maxNodesInput);

  } else if (type === 'CART') {
    advancedPanel.add(ui.Label({value: 'CART Parameters:', style: {fontWeight: 'bold', color: '#547a61', margin: '20px 0 4px 8px'}}));

    makeParamRow('Min Leaf Population:',
      'Sets the minimum number of samples required to be in a terminal node (leaf) of the tree. A higher value leads to a more generalized, simpler tree, which helps to reduce the risk of overfitting.',
      minLeafInput);

  } else if (type === 'SVM') {
    advancedPanel.add(ui.Label({value: 'SVM Parameters:', style: {fontWeight: 'bold', color: '#547a61', margin: '20px 0 4px 8px'}}));

    makeParamRow('Gamma:',
      'Determines the influence of a single training example. A higher gamma value creates a more complex decision boundary that can closely fit the training data, potentially leading to overfitting.',
      svmGammaInput);

    makeParamRow('Cost (C):',
      'The penalty parameter for misclassified training examples. A larger C value imposes a greater penalty for errors, leading to a more complex model that may overfit the data. Conversely, a smaller C leads to a simpler, more generalized model.',
      svmCostInput);
  }
}

// Show/Hide Advanced Panel
advancedToggle.onChange(function(checked) {
  advancedPanel.style().set('shown', checked);
  updateAdvancedSettingsUI(classifierSelect.getValue());
});
classifierSelect.onChange(function(type) {
  updateAdvancedSettingsUI(type);
});

//------------------- CLASSIFICATION BUTTON ----------------
var runButton = ui.Button({
  label: 'Run Classification',
  style: {
    width: '90%',
    margin: '20px auto',
    backgroundColor: '#ADD8E6', 
    color: '#016143',
    border: '1px solid #016143',
    borderRadius: '4px'
  }
});

var loadingLabel = ui.Label('', {color: 'orange'});
panel.add(runButton); panel.add(loadingLabel);


//--------------RESULTS AND LEGEND PANEL------------------------
var resultsPanel = ui.Panel({style:{stretch:'horizontal'}});
panel.add(resultsPanel);

// Legend and results UI on the right of the map
var legendPanel = ui.Panel();
legendPanel.add(ui.Label({
  value: 'Legend',
  style: {fontWeight: 'bold', fontSize: '16px', margin: '4px 0', color:'#42614d'}
}));

var resultsDetailsPanel = ui.Panel();

var bottomLeftPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {position: 'bottom-left', padding: '8px 15px', width: '300px'}
});
bottomLeftPanel.add(legendPanel);
bottomLeftPanel.add(ui.Label({
  value: Array(21).join('―'),
  style: {margin:'4px 0', color: 'grey'}
}));
bottomLeftPanel.add(ui.Label({
  value: 'Classification Results',
  style: {fontWeight: 'bold', fontSize: '16px', margin: '4px 0', color:'#42614d'}
}));
bottomLeftPanel.add(resultsDetailsPanel);
ui.root.add(bottomLeftPanel);

// ------- DYNAMICALLY UPDATE LEGEND CLASSES ACC TO WHAT IS IN THE CURRENT TRAINING SET -----------------
function updateLegendDynamic(title, presentLabels) {
  legendPanel.clear();
  legendPanel.add(ui.Label({
    value: 'Legend',
    style: {fontWeight: 'bold', fontSize: '16px', margin: '4px 0', color:'#42614d'}
  }));
  legendPanel.add(ui.Label({value: title, style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 8px 0'}}));
  presentLabels.evaluate(function(indices) {
    indices.forEach(function(index) {
      legendPanel.add(ui.Panel([
        ui.Label({style: {backgroundColor: palette[index], padding: '8px', margin: '0'}}),
        ui.Label({value: classNames[index], style: {margin: '0 0 0 6px'}})
      ], ui.Panel.Layout.Flow('horizontal')));
    });
  });
}

//--------------PROCESSING SATELLITE IMAGERY------------------------------
function maskClouds(image){
  var qa = image.select('QA60');
  var cloud = 1 << 10, cirrus = 1 << 11;
  return image.updateMask(qa.bitwiseAnd(cloud).eq(0).and(qa.bitwiseAnd(cirrus).eq(0))).divide(10000);
}

function addIndices(image) {
  var ndvi = image.normalizedDifference(['B8','B4']).rename('NDVI');
  var evi = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      NIR: image.select('B8'),
      RED: image.select('B4'),
      BLUE: image.select('B2')
    }).rename('EVI');

  var gndvi = image.normalizedDifference(['B8','B3']).rename('GNDVI');
  var ndwi = image.normalizedDifference(['B3','B8']).rename('NDWI');

  var savi = image.expression(
    '((NIR - RED) / (NIR + RED + 0.5)) * 1.5', {
      NIR: image.select('B8'),
      RED: image.select('B4')
    }).rename('SAVI');

  return image.addBands([ndvi, evi, gndvi, ndwi, savi]);
}

function calculateSampleCount(area){
  return Math.max(30, Math.min(500, Math.round(area / 5e6)));
}

// ------------------- STATE > COUNTY DROPDOWN -------------------
stateSelect.onChange(function(name){
  if (!name) return;
  var fips = states.filter(ee.Filter.eq('NAME', name)).first().get('STATEFP');
  counties.filter(ee.Filter.eq('STATEFP', fips)).aggregate_array('NAME').evaluate(function(list){
    countyPanel.clear();
    countySelect = ui.Select({items:list, placeholder:'Select County',
      style: {width: '80%',  margin: 'auto'  }});
    countyPanel.add(countySelect);
  });
});


//---------------For All Classification---------------------------
function displayResults(results, best, start) {
  resultsDetailsPanel.clear();
  resultsDetailsPanel.add(ui.Label('Classifier Comparison Results'));

  function safeToFixed(val, digits) {
    return (typeof val === 'number') ? val.toFixed(digits) : 'N/A';
  }

  function processResult(index) {
    if (index >= results.length) {
      resultsDetailsPanel.add(ui.Label(
        '✅ Best model: ' + (best.model || 'N/A') +
        ' (' + (best.params || 'N/A') + ') — Accuracy: ' + safeToFixed(best.acc, 3)
      ));
      loadingLabel.setValue('✅ Classifier comparison complete (' +
        ((Date.now() - start) / 1000).toFixed(1) + ' sec)');
      loadingLabel.style().set('color', 'green');
      return;
    }

    var r = results[index];

    // Defensive checks
    if (r.acc && typeof r.acc.evaluate === 'function') {
      r.acc.evaluate(function(accVal) {
        if (r.kappa && typeof r.kappa.evaluate === 'function') {
          r.kappa.evaluate(function(kappaVal) {
            resultsDetailsPanel.add(ui.Label(
              r.model + ' | ' + r.params +
              ' | Acc: ' + safeToFixed(accVal, 3) +
              ' | Kappa: ' + safeToFixed(kappaVal, 3)
            ));
            processResult(index + 1);
          });
        } else {
          resultsDetailsPanel.add(ui.Label(
            r.model + ' | ' + r.params +
            ' | Acc: ' + safeToFixed(accVal, 3) + ' | Kappa: N/A'
          ));
          processResult(index + 1);
        }
      });
    } else {
      // Handle undefined or already evaluated case
      resultsDetailsPanel.add(ui.Label(
        r.model + ' | ' + r.params +
        ' | Acc: ' + safeToFixed(r.acc, 3) +
        ' | Kappa: ' + safeToFixed(r.kappa, 3)
      ));
      processResult(index + 1);
    }
  }

  processResult(0);
}

// ------------------- RUN CLASSIFICATION -------------------
var currentInputs = {};  // Global storage for current UI inputs

runButton.onClick(function(){
  loadingLabel.setValue('Starting...'); loadingLabel.style().set('color','orange');
  Map.clear(); resultsPanel.clear(); legendPanel.clear(); resultsDetailsPanel.clear();

  var state = stateSelect.getValue(),
      county = countySelect ? countySelect.getValue() : null,
      year = parseInt(yearInput.getValue());
  if (!state || !county || isNaN(year) || year < 2008 || year > 2024) {
    loadingLabel.setValue('❌ Please enter a valid year (2008–2024) and select state/county.');
    loadingLabel.style().set('color', 'red');
    return;
  }

  var filteredCounty = counties.filter(ee.Filter.eq('NAME', county))
    .filter(ee.Filter.eq('STATEFP', states.filter(ee.Filter.eq('NAME', state)).first().get('STATEFP')))
    .first();

  var aoi = filteredCounty.geometry();
  Map.centerObject(aoi, 10);
  Map.addLayer(aoi, {color: 'gray'}, 'Selected County Outline');

  loadingLabel.setValue('Loading CDL...');
  
  // Load annual CDL product for the selected year
  var cdl = ee.Image('USDA/NASS/CDL/' + year).select('cropland').clip(aoi);

  loadingLabel.setValue('Loading Sentinel-2...');
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(ee.Date.fromYMD(year, 4, 1), ee.Date.fromYMD(year, 10, 31))
    .filterBounds(aoi)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskClouds)
    .map(addIndices);

  s2.size().evaluate(function(sz){
    if(sz === 0){
      loadingLabel.setValue('❌ No Sentinel-2 imagery found.');
      loadingLabel.style().set('color','red');
      return;
    }

    loadingLabel.setValue('Creating composite...');
    var mask = cdl.remap(validClassCodes, ee.List.repeat(1, validClassCodes.length), 0).gte(1);
    var remapped = cdl.remap(validClassCodes, ee.List.sequence(0, validClassCodes.length - 1)).rename('label').toInt().updateMask(mask);
    var comp = s2.median().clip(aoi).updateMask(mask);
    var trainImg = comp.select(allBands).addBands(remapped);

    aoi.area().evaluate(function(ar){
      var n = calculateSampleCount(ar);
      loadingLabel.setValue('Sampling ' + n + ' per class...');
      var samples = trainImg.stratifiedSample({numPoints: n, classBand: 'label', region: aoi, scale: 60, seed: 42, geometries: true});
      samples = samples.randomColumn('r');
      var trainSet = samples.filter(ee.Filter.lt('r', 0.7));
      var testSet = samples.filter(ee.Filter.gte('r', 0.7));

      samples.size().evaluate(function(size){
        if(size === 0){
          loadingLabel.setValue('⚠ No crops to classify in this county.');
          loadingLabel.style().set('color', 'red');
          resultsPanel.clear();
          return;
        }

        trainSet.size().evaluate(function(trainSize){
          testSet.size().evaluate(function(testSize){

            trainSet.aggregate_array('label').distinct().evaluate(function(trainLabelsList){
              var filteredTestSet = testSet.filter(ee.Filter.inList('label', trainLabelsList));
              filteredTestSet.size().evaluate(function(filteredTestSize){
              //-----------------------------------IF ALL CLASSIFIERS SELECTED---------------------------------
            
              if (compareAllCheckbox.getValue()) {
                loadingLabel.setValue('Running grid search on all classifiers...');
                var start = Date.now();
                var results = [];
                var best = {acc: 0, model: null, params: null, kappa: 0};
              
                // Array to hold async tasks for sequential execution
                var tasks = [];
              
                // Helper to evaluate accuracy/kappa and update best model
                function evalAndStore(modelName, params, accEE, kappaEE, done) {
                  accEE.evaluate(function(accVal) {
                    kappaEE.evaluate(function(kappaVal) {
                      results.push({model: modelName, params: params, acc: accVal, kappa: kappaVal});
                      if (accVal > best.acc) {
                        best = {model: modelName, params: params, acc: accVal, kappa: kappaVal};
                      }
                      done();
                    });
                  });
                }
              
                // Create tasks for RF grid search
                [10, 50, 100].forEach(function(numTrees) {
                  [null, 20, 50].forEach(function(maxNodes) {
                    tasks.push(function(done) {
                      var options = {numberOfTrees: numTrees};
                      if (maxNodes !== null) {
                        options.maxNodes = maxNodes;
                      }
                      var rf = ee.Classifier.smileRandomForest(options);

                      var trained = rf.train(trainSet, 'label', allBands);
                      var classified = filteredTestSet.classify(trained);
                      var cm = classified.errorMatrix('label', 'classification');
                      evalAndStore('Random Forest', 'trees=' + numTrees + ', maxNodes=' + (maxNodes || '∞'), cm.accuracy(), cm.kappa(), done);
                    });
                  });
                });
              
                // Tasks for CART grid search
                [1, 5, 10].forEach(function(minLeaf) {
                  tasks.push(function(done) {
                    var cart = ee.Classifier.smileCart({minLeafPopulation: minLeaf});
                    var trained = cart.train(trainSet, 'label', allBands);
                    var classified = filteredTestSet.classify(trained);
                    var cm = classified.errorMatrix('label', 'classification');
                    evalAndStore('CART', 'minLeaf=' + minLeaf, cm.accuracy(), cm.kappa(), done);
                  });
                });
              
                // Tasks for SVM grid search
                [0.1, 0.5, 1].forEach(function(gamma) {
                  [1, 10, 100].forEach(function(cost) {
                    tasks.push(function(done) {
                      var svm = ee.Classifier.libsvm({
                        gamma: gamma,
                        cost: cost,
                        kernelType: 'RBF'
                      });
                      var trained = svm.train(trainSet, 'label', allBands);
                      var classified = filteredTestSet.classify(trained);
                      var cm = classified.errorMatrix('label', 'classification');
                      evalAndStore('SVM', 'gamma=' + gamma + ', cost=' + cost, cm.accuracy(), cm.kappa(), done);
                    });
                  });
                });
              
                // Run tasks sequentially
                function runTasksSequentially(tasks, i, callback) {
                  if (i >= tasks.length) {
                    callback();
                    return;
                  }
                  tasks[i](function() {
                    runTasksSequentially(tasks, i + 1, callback);
                  });
                }
              
                runTasksSequentially(tasks, 0, function() {
                  // All grid search done - display results
                  displayResults(results, best, start);
                
                  // Now classify the AOI with the best model
                  loadingLabel.setValue('Classifying with best model: ' + best.model + '...');
                
                  var classifier;
                
                  // Build the best classifier again from best.model and best.params string
                  if (best.model === 'Random Forest') {
                    var matchTrees = best.params.match(/trees=(\d+)/);
                    var matchMaxNodes = best.params.match(/maxNodes=(\d+|∞)/);
                    var numTrees = matchTrees ? parseInt(matchTrees[1]) : 50;
                    var maxNodes = (matchMaxNodes && matchMaxNodes[1] !== '∞') ? parseInt(matchMaxNodes[1]) : null;
                    classifier = ee.Classifier.smileRandomForest(numTrees);
                    if (maxNodes !== null) {
                      classifier = classifier.setOutputMode('CLASSIFICATION').setParameters({maxNodes: maxNodes});
                    }
                  } else if (best.model === 'CART') {
                    var matchMinLeaf = best.params.match(/minLeaf=(\d+)/);
                    var minLeaf = matchMinLeaf ? parseInt(matchMinLeaf[1]) : 1;
                    classifier = ee.Classifier.smileCart({minLeafPopulation: minLeaf});
                  } else if (best.model === 'SVM') {
                    var matchGamma = best.params.match(/gamma=([\d\.]+)/);
                    var matchCost = best.params.match(/cost=(\d+)/);
                    var gamma = matchGamma ? parseFloat(matchGamma[1]) : 0.5;
                    var cost = matchCost ? parseFloat(matchCost[1]) : 10;
                    classifier = ee.Classifier.libsvm({gamma: gamma, cost: cost});
                  } else {
                    loadingLabel.setValue('⚠ Could not rebuild classifier for best model.');
                    return;
                  }
                
                  // Train best classifier
                  classifier = classifier.train(trainSet, 'label', allBands);
            
                  // Reduce the image resolution to avoid memory overload
                  var reduced = comp.select(allBands).resample('bilinear').reproject({
                    crs: 'EPSG:4326',
                    scale: 30  // coarser resolution
                  });
                  
                  var classifiedBest = reduced.classify(classifier).clip(aoi);

                  // Add layers to map
                  Map.addLayer(remapped, {min: 0, max: validClassCodes.length - 1, palette: palette}, 'True CDL');
                  Map.addLayer(classifiedBest, {min: 0, max: validClassCodes.length - 1, palette: palette}, 'Best Classification');
                
                  // Update legend dynamically with training labels
                  updateLegendDynamic('Crop Classes for ' + county + ', ' + year, ee.List(trainLabelsList));
                
                  loadingLabel.setValue('✅ Classification completed with best model.');
                  loadingLabel.style().set('color', 'green');
                });

              
                return; // Important: stop further processing here
              }


              //-----------------------------IF 1 CLASSIFIER IS SELECTED----------------------------------
              
                var classifier;
                var type = classifierSelect.getValue();
                if (type === 'Random Forest') {
                // Safely extract number of trees
                var numTrees = (currentInputs && currentInputs.numTreesInput)
                  ? parseInt(currentInputs.numTreesInput.getValue()) || 50
                  : 50;
              
                // Safely extract max nodes
                var maxNodes = (currentInputs && currentInputs.maxNodesInput)
                  ? parseInt(currentInputs.maxNodesInput.getValue())
                  : null;
              
                // Create options object
                var rfOptions = { numberOfTrees: numTrees };
                if (!isNaN(maxNodes)) {
                  rfOptions.maxNodes = maxNodes;
                }
              
                // Create classifier with safe options
                classifier = ee.Classifier.smileRandomForest(rfOptions)
                                          .setOutputMode('CLASSIFICATION');
              }

                else if (type === 'CART') {
                  var minLeaf = (currentInputs && currentInputs.minLeafInput)
                    ? parseInt(currentInputs.minLeafInput.getValue()) || 1
                    : 1;
                  classifier = ee.Classifier.smileCart({minLeafPopulation: minLeaf});
                }
                else if (type === 'SVM') {
                  var gamma = currentInputs && currentInputs.svmGammaInput
                    ? parseFloat(currentInputs.svmGammaInput.getValue()) || 0.5
                    : 0.5;
                  
                  var cost = currentInputs && currentInputs.svmCostInput
                    ? parseFloat(currentInputs.svmCostInput.getValue()) || 10
                    : 10;

                  classifier = ee.Classifier.libsvm({
                    gamma: gamma,
                    cost: cost,
                    kernelType: 'RBF'
                  });

                }


                loadingLabel.setValue('Training ' + type + '...');
                classifier = classifier.train(trainSet, 'label', allBands);

                loadingLabel.setValue('Classifying...');
                var classified = comp.select(allBands).classify(classifier).clip(aoi);

                Map.addLayer(remapped, {min: 0, max: validClassCodes.length - 1, palette: palette}, 'True CDL');
                Map.addLayer(classified, {min: 0, max: validClassCodes.length - 1, palette: palette}, 'Classified Cropland');

                var confusion = filteredTestSet.classify(classifier).errorMatrix('label', 'classification');
                updateLegendDynamic('Crop Classes for ' + county + ', ' + year, ee.List(trainLabelsList));

                resultsDetailsPanel.clear();
                resultsDetailsPanel.add(ui.Label('Total samples: ' + size));
                resultsDetailsPanel.add(ui.Label('Training set size: ' + trainSize));
                resultsDetailsPanel.add(ui.Label('Testing size before filtering: ' + testSize));
                resultsDetailsPanel.add(ui.Label('Testing size after filtering: ' + filteredTestSize));

                confusion.accuracy().evaluate(function(acc){
                  resultsDetailsPanel.add(ui.Label('Overall Accuracy: ' + acc.toFixed(3)));

                  confusion.kappa().evaluate(function(kappa){
                    resultsDetailsPanel.add(ui.Label('Kappa: ' + kappa.toFixed(3)));
                    
                    // Prepare parameters string depending on classifier type
                    var paramsText = '';
                    
                    if (type === 'Random Forest') {
                      var numTrees = currentInputs.numTreesInput ? currentInputs.numTreesInput.getValue() : '50';
                      var maxNodes = currentInputs.maxNodesInput ? currentInputs.maxNodesInput.getValue() : '∞';
                      if (maxNodes === '') maxNodes = '∞';
                      paramsText = 'Number of Trees: ' + numTrees + ', Max Nodes: ' + maxNodes;
                    } else if (type === 'CART') {
                      var minLeaf = currentInputs.minLeafInput ? currentInputs.minLeafInput.getValue() : '1';
                      paramsText = 'Min Leaf Population: ' + minLeaf;
                    } else if (type === 'SVM') {
                      var gamma = currentInputs.svmGammaInput ? currentInputs.svmGammaInput.getValue() : '0.5';
                      var cost = currentInputs.svmCostInput ? currentInputs.svmCostInput.getValue() : '10';
                      paramsText = 'Gamma: ' + gamma + ', Cost: ' + cost;
                    }
                    
                    // Add parameters to results panel
                    resultsDetailsPanel.add(ui.Label('Model Parameters: ' + paramsText));


                    var dl = ui.Button({
                      label: 'Download Classified Map (GeoTIFF)',
                      style: {stretch: 'horizontal', border:'1px solid #345e85', color:'#345e85'},
                      onClick: function(){
                        classified.getDownloadURL({
                          name: 'CropMap_' + county + '_' + year,
                          region: aoi,
                          scale: 30,
                          crs: 'EPSG:4326',
                          format: 'GeoTIFF'
                        }).evaluate(function(url){
                          if(url) window.open(url);
                          else {
                            loadingLabel.setValue('⚠ Failed to generate download URL.');
                            loadingLabel.style().set('color','red');
                          }
                        });
                      }
                    });
                    resultsDetailsPanel.add(dl);
                    loadingLabel.setValue('✅ Classification completed.');
                    loadingLabel.style().set('color','green');
                  });
                });

              });
            });
          });
        });
      });
    });
  });
});
