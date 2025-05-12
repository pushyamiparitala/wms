import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box, ButtonGroup, Button, Typography, Slider, FormControlLabel, Switch, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

const MaterialTreemapChart = ({ data, year, selectedCategory }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [zoomState, setZoomState] = useState({ node: null, previousNode: null });
  const [minWeight, setMinWeight] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [colorMode, setColorMode] = useState('category');
  const [animationSpeed, setAnimationSpeed] = useState(750);

  const getColorScheme = useCallback(() => {
    // Main category colors
    const categoryColors = {
      'Landfill': '#1e3a8a', // Dark blue
      'Recycling': '#0891b2', // Cyan
      'Compost': '#76c893',  // Green
      'Reuse': '#8b5cf6'     // Purple
    };
    
    // Material type color scale - more vibrant for better differentiation
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
    setZoomState({ node: null, previousNode: null });
  };

  const handleWeightChange = (event, newValue) => {
    setMinWeight(newValue);
  };

  const handleLabelToggle = () => {
    setShowLabels(!showLabels);
  };
  
  const handleColorModeChange = (event) => {
    setColorMode(event.target.value);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      d3.select(svgRef.current).selectAll('*').remove();

      const actualData = typeof data === 'function' ? data(year) : data;
      
      // Add fallback data if no data is available or it's not in expected format
      let dataToUse = actualData;
      if (!actualData || !actualData.nodes || !actualData.links || actualData.nodes.length === 0) {
        // Create sample data for visualization
        dataToUse = createSampleData();
      }

      // Get color scheme
      const { categoryColors, materialColorScale } = getColorScheme();
      
      // Set dimensions
      const margin = { top: 30, right: 10, bottom: 10, left: 10 };
      const width = svgRef.current.clientWidth - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Process data to hierarchical format
      const categoryFilter = activeCategory || selectedCategory;
      const processedData = processDataToHierarchy(dataToUse, categoryFilter, minWeight);
      
      // Prepare treemap layout
      const treemap = d3.treemap()
        .size([width, height])
        .paddingTop(20)
        .paddingInner(3)
        .round(true);

      // Create hierarchy and compute values
      const root = d3.hierarchy(processedData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
      
      // Apply treemap layout
      treemap(root);

      // Prepare for zooming
      let currentDepth = 0;
      let currentNode = root;
      
      // Handle zoom on node click
      const zoom = (event, d) => {
        if (d.parent === null || (zoomState.node && d.data.name === zoomState.node.data.name)) {
          // We're already at the root or clicking on the same node
          if (d.parent === null) return; // Don't zoom out from root
          
          // Zoom out to parent
          currentNode = d.parent;
          currentDepth = currentNode.depth;
          setZoomState({ 
            node: currentNode, 
            previousNode: zoomState.node 
          });
        } else {
          // Zoom in to clicked node
          currentNode = d;
          currentDepth = d.depth;
          setZoomState({ 
            node: d, 
            previousNode: zoomState.node 
          });
        }
        
        // Update visualization with zoom
        updateVisualization(currentNode);
      };
      
      // Initial visualization
      updateVisualization(zoomState.node || root);
      
      // Function to update visualization based on current zoom state
      function updateVisualization(node) {
        // Calculate transition duration
        const transitionDuration = animationSpeed;
        
        // Get visible descendants
        const descendants = node === root ? 
          root.descendants().filter(d => d.depth === 1 || d.depth === 2) : 
          node.descendants();
        
        // Create cell groups for each descendant
        const cell = svg.selectAll('g.cell')
          .data(descendants, d => d.data.name);
        
        // Remove exiting cells with animation
        cell.exit()
          .transition().duration(transitionDuration)
          .attr('transform', d => {
            const x = width / 2;
            const y = height / 2;
            return `translate(${x},${y}) scale(0.001)`;
          })
          .attr('opacity', 0)
          .remove();
        
        // Enter new cells with animation
        const cellEnter = cell.enter()
          .append('g')
          .attr('class', 'cell')
          .attr('transform', d => {
            // Start from center for animation
            const x = width / 2;
            const y = height / 2;
            return `translate(${x},${y}) scale(0.001)`;
          })
          .attr('opacity', 0)
          .style('cursor', 'pointer')
          .on('click', zoom);
        
        // Add rectangles for cells
        cellEnter.append('rect')
          .attr('width', d => Math.max(0, d.x1 - d.x0))
          .attr('height', d => Math.max(0, d.y1 - d.y0))
          .attr('fill', d => {
            if (colorMode === 'category') {
              // Color by waste category
              if (d.depth === 1) return categoryColors[d.data.name] || '#aaa';
              if (d.depth === 2) return d3.color(categoryColors[d.parent.data.name]).brighter(0.5);
            } else {
              // Color by material type
              if (d.depth === 1) return categoryColors[d.data.name] || '#aaa';
              if (d.depth === 2) return materialColorScale(d.data.name);
            }
            return '#ccc';
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        
        // Add text labels
        cellEnter.append('text')
          .attr('class', 'label-text')
          .attr('x', 5)
          .attr('y', 15)
          .attr('fill', d => d.depth === 1 ? '#fff' : '#000')
          .attr('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
          .attr('pointer-events', 'none')
          .attr('opacity', 0) // Start invisible for animation
          .text(d => {
            // For depth 1 (categories), always show name
            if (d.depth === 1) return d.data.name;
            
            // For depth 2 (materials), use truncation based on space
            const width = d.x1 - d.x0;
            const name = d.data.name;
            
            // Only show name if rectangle is big enough
            if (width < 40) return '';
            
            // Truncate name based on width
            const maxChars = Math.floor(width / 6);
            return name.length > maxChars ? name.substring(0, maxChars - 3) + '...' : name;
          });
        
        // Add percentage/value text
        cellEnter.append('text')
          .attr('class', 'value-text')
          .attr('x', 5)
          .attr('y', 30)
          .attr('fill', d => d.depth === 1 ? '#fff' : '#333')
          .attr('font-size', '10px')
          .attr('pointer-events', 'none')
          .attr('opacity', 0) // Start invisible for animation
          .text(d => {
            const percentage = (d.value / root.value) * 100;
            return `${d3.format(".1f")(percentage)}% (${d3.format(".2s")(d.value)} lbs)`;
          });
        
        // Animate entering cells
        cellEnter.transition()
          .duration(transitionDuration)
          .attr('transform', d => `translate(${d.x0},${d.y0})`)
          .attr('opacity', 1);
        
        // Animate texts after cells appear
        cellEnter.selectAll('text')
          .transition()
          .delay(transitionDuration * 0.7)
          .duration(transitionDuration * 0.3)
          .attr('opacity', d => {
            if (!showLabels) return 0;
            
            if (d.depth === 1) return 1;
            
            // Only show text for cells with enough space
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            const isValueText = d3.select(this).classed('value-text');
            
            if (isValueText) {
              return (width > 60 && height > 40) ? 1 : 0;
            }
            
            return (width > 40) ? 1 : 0;
          });
        
        // Update existing cells
        cell.transition()
          .duration(transitionDuration)
          .attr('transform', d => `translate(${d.x0},${d.y0})`)
          .attr('opacity', 1);
        
        // Update rectangles
        cell.select('rect')
          .transition()
          .duration(transitionDuration)
          .attr('width', d => Math.max(0, d.x1 - d.x0))
          .attr('height', d => Math.max(0, d.y1 - d.y0))
          .attr('fill', d => {
            if (colorMode === 'category') {
              // Color by waste category
              if (d.depth === 1) return categoryColors[d.data.name] || '#aaa';
              if (d.depth === 2) return d3.color(categoryColors[d.parent.data.name]).brighter(0.5);
            } else {
              // Color by material type
              if (d.depth === 1) return categoryColors[d.data.name] || '#aaa';
              if (d.depth === 2) return materialColorScale(d.data.name);
            }
            return '#ccc';
          });
        
        // Update label visibility
        cell.selectAll('text')
          .transition()
          .duration(transitionDuration * 0.5)
          .attr('opacity', d => {
            if (!showLabels) return 0;
            
            if (d.depth === 1) return 1;
            
            // Only show text for cells with enough space
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            const element = d3.select(this);
            const isValueText = element.classed('value-text');
            
            if (isValueText) {
              return (width > 60 && height > 40) ? 1 : 0;
            }
            
            return (width > 40) ? 1 : 0;
          });
        
        // Add hover effects
        cellEnter.on('mouseover', function(event, d) {
          // Highlight cell on hover
          d3.select(this).select('rect')
            .transition().duration(200)
            .attr('stroke', '#000')
            .attr('stroke-width', 2)
            .attr('fill-opacity', 0.9);
          
          // Show tooltip
          const percentage = (d.value / root.value) * 100;
          let tooltipContent = `<strong>${d.data.name}</strong><br>`;
          tooltipContent += `${d3.format(",.0f")(d.value)} lbs (${d3.format(".1f")(percentage)}%)`;
          
          if (d.depth === 2) {
            tooltipContent += `<br>Category: ${d.parent.data.name}`;
          }
          
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: tooltipContent
          });
        })
        .on('mouseout', function() {
          // Reset highlight
          d3.select(this).select('rect')
            .transition().duration(200)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('fill-opacity', 1);
          
          // Hide tooltip
          setTooltip({ ...tooltip, visible: false });
        });
        
        // Add title for current view
        svg.selectAll('.treemap-title').remove();
        
        svg.append('text')
          .attr('class', 'treemap-title')
          .attr('x', width / 2)
          .attr('y', -10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .text(() => {
            if (node === root) return `Material Distribution by Category ${year ? `(${year})` : ''}`;
            return `${node.data.name} Breakdown ${year ? `(${year})` : ''}`;
          });
        
        // Add breadcrumbs navigation
        svg.selectAll('.breadcrumb').remove();
        
        if (node !== root) {
          svg.append('text')
            .attr('class', 'breadcrumb')
            .attr('x', 5)
            .attr('y', -10)
            .attr('font-size', '12px')
            .attr('cursor', 'pointer')
            .text('« Back to Overview')
            .on('click', () => {
              currentNode = root;
              currentDepth = 0;
              setZoomState({ node: root, previousNode: node });
              updateVisualization(root);
            });
        }
      }
      
    } catch (error) {
      console.error('Error creating treemap visualization:', error);
    }
  }, [data, year, selectedCategory, activeCategory, minWeight, showLabels, zoomState, colorMode, animationSpeed, getColorScheme]);

  // Function to process data into hierarchical format
  const processDataToHierarchy = (rawData, categoryFilter, minWeight) => {
    try {
      const materialsByCategory = {};
      
      // Get categories and initialize
      const categories = Array.from(
        new Set(
          rawData.nodes
            .filter(node => node.type === 'category')
            .map(node => node.name)
        )
      );
      
      categories.forEach(category => {
        materialsByCategory[category] = {};
      });
      
      // Populate material weights by category
      rawData.links.forEach(link => {
        const source = rawData.nodes[link.source];
        const target = rawData.nodes[link.target];
        
        if (source.type === 'material' && target.type === 'category') {
          const material = source.name;
          const category = target.name;
          
          if (!materialsByCategory[category][material]) {
            materialsByCategory[category][material] = 0;
          }
          
          materialsByCategory[category][material] += link.value;
        }
      });
      
      // Build hierarchical structure
      const hierarchyData = {
        name: 'Material Distribution',
        children: []
      };
      
      // Filter categories if needed
      const filteredCategories = categoryFilter && categoryFilter !== 'all' ?
        categories.filter(cat => cat === categoryFilter) : categories;
      
      // Add categories and their materials
      filteredCategories.forEach(category => {
        const categoryNode = {
          name: category,
          children: []
        };
        
        // Add materials as children
        Object.entries(materialsByCategory[category])
          .filter(([_, value]) => value >= minWeight) // Apply minimum weight filter
          .sort((a, b) => b[1] - a[1]) // Sort by weight, descending
          .forEach(([material, weight]) => {
            categoryNode.children.push({
              name: material,
              value: weight
            });
          });
        
        // Only add category if it has materials
        if (categoryNode.children.length > 0) {
          hierarchyData.children.push(categoryNode);
        }
      });
      
      return hierarchyData;
    } catch (error) {
      console.error('Error processing data for treemap:', error);
      return { name: 'Error', children: [] };
    }
  };

  // Function to create sample data if real data is not available
  const createSampleData = () => {
    return {
      nodes: [
        // Category nodes
        { name: 'Landfill', type: 'category', id: 0 },
        { name: 'Recycling', type: 'category', id: 1 },
        { name: 'Compost', type: 'category', id: 2 },
        { name: 'Reuse', type: 'category', id: 3 },
        
        // Material nodes
        { name: 'Paper', type: 'material', id: 4 },
        { name: 'Plastic', type: 'material', id: 5 },
        { name: 'Metal', type: 'material', id: 6 },
        { name: 'Glass', type: 'material', id: 7 },
        { name: 'Food Waste', type: 'material', id: 8 },
        { name: 'Yard Waste', type: 'material', id: 9 },
        { name: 'Mixed Organics', type: 'material', id: 10 },
        { name: 'Construction & Demolition', type: 'material', id: 11 },
        { name: 'E-waste', type: 'material', id: 12 },
        { name: 'Confidential Shredding', type: 'material', id: 13 },
        { name: 'Donations', type: 'material', id: 14 },
        { name: 'Mixed Recycling', type: 'material', id: 15 },
        { name: 'Other', type: 'material', id: 16 }
      ],
      links: [
        // Paper links
        { source: 4, target: 0, value: 30000 }, // Paper to Landfill
        { source: 4, target: 1, value: 150000 }, // Paper to Recycling
        
        // Plastic links
        { source: 5, target: 0, value: 80000 }, // Plastic to Landfill
        { source: 5, target: 1, value: 120000 }, // Plastic to Recycling
        
        // Metal links
        { source: 6, target: 0, value: 10000 }, // Metal to Landfill
        { source: 6, target: 1, value: 80000 }, // Metal to Recycling
        
        // Glass links
        { source: 7, target: 0, value: 15000 }, // Glass to Landfill
        { source: 7, target: 1, value: 60000 }, // Glass to Recycling
        
        // Food Waste links
        { source: 8, target: 0, value: 50000 }, // Food Waste to Landfill
        { source: 8, target: 2, value: 200000 }, // Food Waste to Compost
        
        // Yard Waste links
        { source: 9, target: 0, value: 20000 }, // Yard Waste to Landfill
        { source: 9, target: 2, value: 180000 }, // Yard Waste to Compost
        
        // Mixed Organics links
        { source: 10, target: 0, value: 40000 }, // Mixed Organics to Landfill
        { source: 10, target: 2, value: 120000 }, // Mixed Organics to Compost
        
        // Construction & Demolition links
        { source: 11, target: 0, value: 130000 }, // C&D to Landfill
        { source: 11, target: 1, value: 70000 }, // C&D to Recycling
        
        // E-waste links
        { source: 12, target: 0, value: 5000 }, // E-waste to Landfill
        { source: 12, target: 1, value: 30000 }, // E-waste to Recycling
        
        // Confidential Shredding links
        { source: 13, target: 1, value: 25000 }, // Confidential Shredding to Recycling
        
        // Donations links
        { source: 14, target: 3, value: 35000 }, // Donations to Reuse
        
        // Mixed Recycling links
        { source: 15, target: 0, value: 30000 }, // Mixed Recycling to Landfill
        { source: 15, target: 1, value: 220000 }, // Mixed Recycling to Recycling
        
        // Other links
        { source: 16, target: 0, value: 100000 } // Other to Landfill
      ]
    };
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="color-mode-label">Color By</InputLabel>
            <Select
              labelId="color-mode-label"
              value={colorMode}
              label="Color By"
              onChange={handleColorModeChange}
              size="small"
            >
              <MenuItem value="category">Waste Category</MenuItem>
              <MenuItem value="material">Material Type</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch 
                checked={showLabels} 
                onChange={handleLabelToggle}
                size="small"
              />
            }
            label="Show Labels"
            labelPlacement="start"
          />
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Minimum Weight Threshold: {minWeight.toLocaleString()} lbs</span>
          <span>Click rectangles to zoom in/out</span>
        </Typography>
        <Slider
          value={minWeight}
          onChange={handleWeightChange}
          aria-labelledby="weight-threshold-slider"
          min={0}
          max={100000}
          step={5000}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value.toLocaleString()} lbs`}
          sx={{ width: '100%' }}
        />
      </Box>
      
      <Box sx={{ position: 'relative', width: '100%', height: '500px', bgcolor: '#fafafa', borderRadius: 1, boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)' }}>
        <svg ref={svgRef} width="100%" height="500" />
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

export default MaterialTreemapChart; 