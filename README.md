# Crop Classification Tool in Google Earth Engine

This repository contains the source code for an interactive crop classification tool built on the Google Earth Engine (GEE) platform. The application leverages Sentinel-2 satellite imagery and the USDA Cropland Data Layer (CDL) to perform supervised classification of crop types across various U.S. counties.

## Features

- **Interactive User Interface**: Select a U.S. state, county, and year to define your area of interest.
- **Multiple Classifiers**: Choose between Random Forest, CART, and Support Vector Machines (SVM).
- **Hyperparameter Tuning**: Fine-tune classifier parameters with a dedicated advanced settings panel and explanatory tooltips.
- **Automated Optimization**: Run a grid search to compare all classifiers and their parameters to find the best-performing model.
- **Dynamic Results**: View real-time feedback on classification progress, accuracy metrics (Overall Accuracy, Kappa), and a dynamic legend.
- **Data Export**: Download the final classified map as a GeoTIFF file.

## How to Use

The application is hosted directly on the Google Earth Engine platform. You can access and run the tool by clicking the link below:

**[Launch the Crop Classification GEE App]([https://earthengine.google.com/your-gee-app-link-here](https://crop-classification-467508.projects.earthengine.app/view/crop-classification))**

***

## Repository Contents

- `crop_classification_app.js`: The full JavaScript code for the GEE application.
- `README.md`: This file.

## Methodology

The methodology is detailed in the accompanying research paper, but in brief, the tool:
1.  Filters Sentinel-2 imagery for the specified growing season (April to October).
2.  Performs cloud masking and creates a median composite.
3.  Calculates five key vegetation indices (NDVI, EVI, GNDVI, NDWI, SAVI) to enhance feature space.
4.  Uses the USDA CDL as ground truth data for stratified sampling.
5.  Trains and evaluates the chosen machine learning classifier using a 70/30 training/testing split.
6.  Classifies the entire area of interest and displays the results.
