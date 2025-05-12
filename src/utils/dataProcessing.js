export const processData = (data) => {
  // Extract unique years
  const years = [...new Set(data.map(d => d.Year))].sort();

  // Process time series data
  const timeSeriesData = years.map(year => {
    const yearData = data.filter(d => d.Year === year);
    return {
      year: parseInt(year),
      landfill: yearData
        .filter(d => d.Category === 'Landfill')
        .reduce((sum, d) => sum + (d.Weight || 0), 0),
      recycling: yearData
        .filter(d => d.Category === 'Recycle')
        .reduce((sum, d) => sum + (d.Weight || 0), 0),
      compost: yearData
        .filter(d => d.Category === 'Compost')
        .reduce((sum, d) => sum + (d.Weight || 0), 0)
    };
  });

  // Process composition data for treemap
  const getCompositionData = (year) => {
    const yearData = data.filter(d => d.Year === year);
    return {
      name: 'Total Waste',
      children: [
        {
          name: 'Landfill',
          children: yearData
            .filter(d => d.Category === 'Landfill')
            .map(d => ({
              name: d.MaterialType,
              value: d.Weight || 0
            }))
        },
        {
          name: 'Recycling',
          children: yearData
            .filter(d => d.Category === 'Recycle')
            .map(d => ({
              name: d.MaterialType,
              value: d.Weight || 0
            }))
        },
        {
          name: 'Compost',
          children: yearData
            .filter(d => d.Category === 'Compost')
            .map(d => ({
              name: d.MaterialType,
              value: d.Weight || 0
            }))
        }
      ]
    };
  };

  // Process network data for Sankey diagram
  const getNetworkData = (year) => {
    const yearData = data.filter(d => d.Year === year);
    
    // Create nodes and links based on waste flow
    const nodes = [];
    const links = [];
    
    // Add source nodes (material types)
    yearData.forEach(d => {
      if (!nodes.find(n => n.name === d.MaterialType)) {
        nodes.push({ name: d.MaterialType });
      }
    });

    // Add target nodes (categories)
    ['Landfill', 'Recycling', 'Compost'].forEach(category => {
      if (!nodes.find(n => n.name === category)) {
        nodes.push({ name: category });
      }
    });

    // Create links
    yearData.forEach(d => {
      // Convert category name if needed
      const targetName = d.Category === 'Recycle' ? 'Recycling' : d.Category;
      
      links.push({
        source: nodes.findIndex(n => n.name === d.MaterialType),
        target: nodes.findIndex(n => n.name === targetName),
        value: d.Weight || 0
      });
    });

    return { nodes, links };
  };
  
  // Process distribution data for bubble chart
  const getDistributionData = (year) => {
    const yearData = data.filter(d => d.Year === year);
    
    // Group data by material type across all categories
    const materialGroups = {};
    
    yearData.forEach(d => {
      if (!materialGroups[d.MaterialType]) {
        materialGroups[d.MaterialType] = {
          name: d.MaterialType,
          category: d.Category,
          totalWeight: 0,
          values: []
        };
      }
      
      materialGroups[d.MaterialType].totalWeight += (d.Weight || 0);
      materialGroups[d.MaterialType].values.push({
        category: d.Category,
        weight: d.Weight || 0
      });
    });
    
    return Object.values(materialGroups)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 10); // Return top 10 materials by weight
  };

  return {
    years,
    timeSeriesData,
    compositionData: getCompositionData,
    networkData: getNetworkData,
    distributionData: getDistributionData
  };
}; 