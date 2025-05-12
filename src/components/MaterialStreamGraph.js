import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box, Button, ButtonGroup, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const MaterialStreamGraph = ({ data, year, selectedCategory }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [hoveredMaterial, setHoveredMaterial] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load CSV data directly
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        setIsLoading(true);
        const csvData = await d3.csv('/data/assign2_25S_wastedata.csv');
        
        if (csvData && csvData.length > 0) {
          // Process the data
          const processedData = csvData.map(row => {
            // Parse weight - remove commas and convert to number
            const weightStr = row['Weight (lbs)'] || '0';
            const weight = parseFloat(weightStr.replace(/,/g, ''));
            
            return {
              Year: row.Year ? parseInt(row.Year) : null,
              Month: row.Month || '',
              Category: row.Category === 'Recycle' ? 'Recycling' : (row.Category || ''),
              MaterialType: row['Material Type'] || '',
              Weight: isNaN(weight) ? 0 : weight
            };
          }).filter(d => d.Year && d.Category && d.Weight > 0);
          
          setRawData(processedData);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading CSV data:', error);
        setIsLoading(false);
      }
    };
    
    loadCSVData();
  }, []);

  const getColorScheme = useCallback(() => {
    // Main category colors 
    const categoryColors = {
      'Landfill': '#1e3a8a', // Dark blue
      'Recycling': '#0891b2', // Cyan
      'Compost': '#76c893',  // Green
      'Reuse': '#8b5cf6'     // Purple
    };
    
    // Material type color scale - vibrant colors for better visibility
    const materialColorScale = d3.scaleOrdinal()
      .domain([
        'Paper', 'Plastic', 'Metal', 'Glass', 'Food Waste', 
        'Yard Waste', 'Mixed Organics', 'Construction & Demolition',
        'E-waste', 'Confidential Shredding', 'Donations', 'Mixed Recycling', 'Other'
      ])
      .range([
        '#e63946', '#f1c453', '#a8dadc', '#457b9d', '#1d3557',
        '#f4a261', '#2a9d8f', '#e9c46a', '#f8961e', '#f3722c',
        '#90be6d', '#43aa8b', '#577590'
      ]);
    
    return { categoryColors, materialColorScale };
  }, []);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  const handleSortChange = (event) => {
    setSortMode(event.target.value);
  };

  useEffect(() => {
    if (!svgRef.current || isLoading || rawData.length === 0) return;

    try {
      d3.select(svgRef.current).selectAll('*').remove();

      // Filter data based on active category
      const filteredData = activeCategory === 'all' 
        ? rawData 
        : rawData.filter(d => d.Category === activeCategory);

      // Prepare data for stream graph
      const materialsByYear = prepareStreamData(filteredData);

      // Calculate color scheme
      const { materialColorScale } = getColorScheme();

      // Set dimensions
      const margin = { top: 40, right: 40, bottom: 40, left: 60 };
      const width = svgRef.current.clientWidth - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Get years and material types
      const years = Object.keys(materialsByYear).map(Number).sort((a, b) => a - b);
      
      // Create stacked data structure
      const stackData = [];
      
      // Get all unique material types across all years
      const allMaterials = new Set();
      Object.values(materialsByYear).forEach(yearData => {
        Object.keys(yearData).forEach(mat => allMaterials.add(mat));
      });
      const materials = Array.from(allMaterials);
      
      // Create data points for each year
      years.forEach(year => {
        const yearData = { year };
        
        // Initialize all materials to 0
        materials.forEach(mat => {
          yearData[mat] = materialsByYear[year][mat] || 0;
        });
        
        stackData.push(yearData);
      });
      
      // Set up scales
      const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain([0, d3.max(stackData, d => {
          return d3.sum(materials, mat => d[mat] || 0);
        })])
        .range([height, 0]);
        
      // Create stack generator
      const stack = d3.stack()
        .keys(materials)
        .offset(d3.stackOffsetWiggle)  // Creates streamgraph offset
        .order(getStackOrder(sortMode));  // Sort order
      
      // Generate stacked data
      const stackedData = stack(stackData);
      
      // Create area generator
      const area = d3.area()
        .x(d => xScale(d.data.year))
        .y0(d => d[0])
        .y1(d => d[1])
        .curve(d3.curveBasis);  // Smooth curves
      
      // Draw stream paths
      svg.selectAll('.stream')
        .data(stackedData)
        .join('path')
        .attr('class', 'stream')
        .attr('d', area)
        .attr('fill', d => materialColorScale(d.key))
        .attr('opacity', d => hoveredMaterial ? (d.key === hoveredMaterial ? 1 : 0.3) : 0.9)
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
          // Highlight this material
          setHoveredMaterial(d.key);
          
          // Show tooltip
          const totalWeight = d3.sum(d, point => point[1] - point[0]);
          const tooltipContent = `
            <strong>${d.key}</strong><br>
            Total: ${d3.format(',')(Math.round(totalWeight))} lbs
          `;
          
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: tooltipContent
          });
        })
        .on('mousemove', function(event) {
          // Update tooltip position on mouse move
          setTooltip(prev => ({
            ...prev,
            x: event.pageX,
            y: event.pageY
          }));
        })
        .on('mouseout', function() {
          setHoveredMaterial(null);
          setTooltip(prev => ({ ...prev, visible: false }));
        });
      
      // Add x-axis
      const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.format('d')) // Format as integers for years
        .ticks(years.length)
        .tickValues(years);
      
      svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);
      
      // Add y-axis (only show on the left since it's a stream graph)
      svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale)
          .tickFormat(d => d3.format('.2s')(d) + ' lbs')
          .ticks(5)
        );
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(`Material Distribution Over Time ${activeCategory !== 'all' ? `(${activeCategory})` : ''}`);
      
      // Add axes labels
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 30)
        .attr('text-anchor', 'middle')
        .text('Year');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -40)
        .attr('text-anchor', 'middle')
        .text('Weight (lbs)');
      
      // Add legend for top materials (to avoid cluttering)
      const topMaterials = materials
        .map(mat => {
          const total = d3.sum(stackData, d => d[mat] || 0);
          return { material: mat, total };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);  // Show top 10
      
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 10)`);
      
      legend.selectAll('.legend-item')
        .data(topMaterials)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .call(g => {
          g.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => materialColorScale(d.material));
          
          g.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '10px')
            .text(d => d.material);
        })
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          setHoveredMaterial(d.material);
        })
        .on('mouseout', function() {
          setHoveredMaterial(null);
        });
      
    } catch (error) {
      console.error('Error creating stream graph:', error);
    }
  }, [rawData, activeCategory, sortMode, hoveredMaterial, isLoading, getColorScheme]);

  // Function to prepare data for stream graph
  const prepareStreamData = (filteredData) => {
    const materialsByYear = {};
    
    // Group data by year and material type
    filteredData.forEach(d => {
      if (!materialsByYear[d.Year]) {
        materialsByYear[d.Year] = {};
      }
      
      if (!materialsByYear[d.Year][d.MaterialType]) {
        materialsByYear[d.Year][d.MaterialType] = 0;
      }
      
      materialsByYear[d.Year][d.MaterialType] += d.Weight;
    });
    
    return materialsByYear;
  };

  // Function to get stack order based on sort mode
  const getStackOrder = (mode) => {
    switch (mode) {
      case 'ascending':
        return d3.stackOrderAscending;
      case 'descending':
        return d3.stackOrderDescending;
      case 'inside-out':
        return d3.stackOrderInsideOut;
      case 'none':
        return d3.stackOrderNone;
      default:
        return d3.stackOrderInsideOut;
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '600px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: 1 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button 
            onClick={() => handleCategoryChange('all')}
            variant={activeCategory === 'all' ? 'contained' : 'outlined'}
          >
            All Categories
          </Button>
          <Button 
            onClick={() => handleCategoryChange('Landfill')}
            variant={activeCategory === 'Landfill' ? 'contained' : 'outlined'}
            sx={{ bgcolor: activeCategory === 'Landfill' ? '#1e3a8a20' : 'inherit' }}
          >
            Landfill
          </Button>
          <Button 
            onClick={() => handleCategoryChange('Recycling')}
            variant={activeCategory === 'Recycling' ? 'contained' : 'outlined'}
            sx={{ bgcolor: activeCategory === 'Recycling' ? '#0891b220' : 'inherit' }}
          >
            Recycling
          </Button>
          <Button 
            onClick={() => handleCategoryChange('Compost')}
            variant={activeCategory === 'Compost' ? 'contained' : 'outlined'}
            sx={{ bgcolor: activeCategory === 'Compost' ? '#76c89320' : 'inherit' }}
          >
            Compost
          </Button>
          <Button 
            onClick={() => handleCategoryChange('Reuse')}
            variant={activeCategory === 'Reuse' ? 'contained' : 'outlined'}
            sx={{ bgcolor: activeCategory === 'Reuse' ? '#8b5cf620' : 'inherit' }}
          >
            Reuse
          </Button>
        </ButtonGroup>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sort-mode-label">Layer Sorting</InputLabel>
          <Select
            labelId="sort-mode-label"
            value={sortMode}
            label="Layer Sorting"
            onChange={handleSortChange}
            size="small"
          >
            <MenuItem value="default">Inside Out</MenuItem>
            <MenuItem value="ascending">Ascending</MenuItem>
            <MenuItem value="descending">Descending</MenuItem>
            <MenuItem value="none">None</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Hover over layers to highlight materials. The visualization shows how material composition changes over time.
        </Typography>
      </Box>
      
      <Box sx={{ position: 'relative', width: '100%', height: '500px', bgcolor: '#fafafa', borderRadius: 1, boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography>Loading data...</Typography>
          </Box>
        ) : (
          <svg ref={svgRef} width="100%" height="500" />
        )}
      </Box>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y + 10,
            left: tooltip.x + 10,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            dangerouslySetInnerHTML: { __html: tooltip.content }
          }}
        />
      )}
    </Box>
  );
};

export default MaterialStreamGraph; 