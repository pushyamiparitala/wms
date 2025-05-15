# Campus Waste Management Dashboard

## Project Overview

This interactive web-based visualization dashboard presents a comprehensive analysis of campus waste management data. It tells a compelling story about waste generation patterns, material distribution, and opportunities for improvement in sustainability practices.

### Key Features

The dashboard includes three main visualizations:

1. **Waste Generation Patterns Over Time**: A time series analysis that tracks waste volume trends across different categories, revealing seasonal patterns and long-term changes in campus waste generation.

2. **Hierarchical Waste Composition (Zoomable Treemap)**: An interactive visualization that reveals the detailed breakdown of waste materials and their relative proportions, highlighting areas for intervention. Users can click on rectangles to zoom in and explore specific categories in detail.

3. **Waste Misclassification Network**: A force-directed graph that exposes the connections between waste categories, illustrating how materials are often incorrectly sorted.

## Key Insights

- **BOH Food Waste** is the largest component of compostable waste being sent to landfill, suggesting kitchen waste practices should be a priority focus area.
- The dashboard enables data-driven decision-making for campus sustainability initiatives.
- The visualizations reveal both temporal patterns and compositional details of the waste stream.

## Instructions for Use

1. **Time Series Chart**: Use the interactive timeline to explore waste patterns over different years.
2. **Zoomable Treemap**: Click on rectangles to zoom in on specific waste categories. Click the "Back to Overview" link to return to the main view.
3. **Force-Directed Graph**: Hover over nodes and connections to see detailed information about waste flow between categories.

## Technical Implementation

This project is built using:
- React.js for the component framework
- D3.js for data visualization
- Material-UI for layout and styling

## Local Development

To run this project locally:

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm start`
4. Build for production with `npm run build`
