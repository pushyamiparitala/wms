import * as d3 from 'd3';

/**
 * Loads waste data from CSV file and processes it for visualization
 * @returns {Promise<Array>} Processed waste data
 */
export const loadWasteData = async () => {
  try {
    // Load the CSV file
    const csvData = await d3.csv('/data/assign2_25S_wastedata.csv');
    
    // Process each row
    return csvData.map(row => {
      // Parse weight - remove commas and convert to number
      const weightStr = row['Weight (lbs)'] || '0';
      const weight = parseFloat(weightStr.replace(/,/g, ''));
      
      return {
        Year: row.Year ? parseInt(row.Year) : null,
        Month: row.Month || '',
        Day: row.Day || '',
        Category: row.Category || '',
        MaterialType: row['Material Type'] || '',
        Weight: isNaN(weight) ? 0 : weight,
        Vendor: row.Vendor || '',
        DateUpdated: row['Date Updated'] || '',
        Cost: row.Cost || ''
      };
    }).filter(d => d.Year && d.Category && d.Weight > 0); // Filter out invalid entries
  } catch (error) {
    console.error('Error loading waste data:', error);
    return [];
  }
};

/**
 * Aggregates waste data by year and category
 * @param {Array} data Raw waste data
 * @returns {Array} Aggregated annual data for time series chart
 */
export const prepareTimeSeriesData = (data) => {
  // Group by year
  const yearGroups = d3.group(data, d => d.Year);
  
  // Convert to array of objects with yearly totals by category
  return Array.from(yearGroups, ([year, yearData]) => {
    // Calculate totals for each category
    const landfill = d3.sum(yearData.filter(d => d.Category === 'Landfill'), d => d.Weight);
    const recycling = d3.sum(yearData.filter(d => d.Category === 'Recycle'), d => d.Weight);
    const compost = d3.sum(yearData.filter(d => d.Category === 'Compost'), d => d.Weight);
    
    return {
      year,
      landfill,
      recycling,
      compost,
      total: landfill + recycling + compost
    };
  }).sort((a, b) => a.year - b.year); // Sort by year
};

/**
 * Creates network data structure for the waste flow diagram
 * @param {Array} data Raw waste data
 * @param {number} year Selected year
 * @returns {Object} Nodes and links for Sankey diagram
 */
export const prepareNetworkData = (data, year) => {
  // Filter data for selected year
  const yearData = year ? data.filter(d => d.Year === year) : data;
  
  if (yearData.length === 0) {
    return { nodes: [], links: [] };
  }
  
  // Group data by category and material type
  const categories = Array.from(new Set(yearData.map(d => d.Category === 'Recycle' ? 'Recycling' : d.Category)));
  const materialTypes = Array.from(new Set(yearData.map(d => d.MaterialType)));
  
  // Create nodes
  const nodes = [
    ...categories.map(name => ({ name, type: 'category' })),
    ...materialTypes.map(name => ({ name, type: 'material' }))
  ];
  
  // Create links from materials to categories
  const links = yearData.map(d => {
    const sourceName = d.MaterialType;
    const targetName = d.Category === 'Recycle' ? 'Recycling' : d.Category;
    
    const source = nodes.findIndex(node => node.name === sourceName);
    const target = nodes.findIndex(node => node.name === targetName);
    
    return {
      source,
      target,
      value: d.Weight,
      sourceName,
      targetName
    };
  });
  
  return { nodes, links };
};

/**
 * Prepares hierarchical data for treemap visualization
 * @param {Array} data Raw waste data
 * @param {number} year Selected year
 * @returns {Object} Hierarchical data structure
 */
export const prepareCompositionData = (data, year) => {
  // Filter data for selected year
  const yearData = year ? data.filter(d => d.Year === year) : data;
  
  // Return hierarchical structure
  return {
    name: 'Total Waste',
    children: [
      {
        name: 'Landfill',
        children: d3.rollup(
          yearData.filter(d => d.Category === 'Landfill'),
          v => d3.sum(v, d => d.Weight),
          d => d.MaterialType
        ),
      },
      {
        name: 'Recycling',
        children: d3.rollup(
          yearData.filter(d => d.Category === 'Recycle'),
          v => d3.sum(v, d => d.Weight),
          d => d.MaterialType
        ),
      },
      {
        name: 'Compost',
        children: d3.rollup(
          yearData.filter(d => d.Category === 'Compost'),
          v => d3.sum(v, d => d.Weight),
          d => d.MaterialType
        ),
      }
    ].map(category => ({
      name: category.name,
      children: Array.from(category.children, ([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
    }))
  };
};

/**
 * Prepares distribution data for waste bubble chart
 * @param {Array} data Raw waste data
 * @param {number} year Selected year
 * @returns {Array} Processed distribution data
 */
export const prepareDistributionData = (data, year) => {
  // Filter data for selected year
  const yearData = year ? data.filter(d => d.Year === year) : data;
  
  // Group by material type and calculate totals
  const materialGroups = d3.group(yearData, d => d.MaterialType);
  
  // Convert to array of objects
  return Array.from(materialGroups, ([materialType, items]) => {
    const categoryData = d3.rollup(
      items,
      v => d3.sum(v, d => d.Weight),
      d => d.Category
    );
    
    return {
      name: materialType,
      totalWeight: d3.sum(items, d => d.Weight),
      categories: Array.from(categoryData, ([name, value]) => ({ name, value }))
    };
  })
  .sort((a, b) => b.totalWeight - a.totalWeight)
  .slice(0, 12); // Top 12 materials by weight
}; 