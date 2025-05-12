import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box, ButtonGroup, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

const MaterialDistributionChart = ({ data, year, selectedCategory }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [viewMode, setViewMode] = useState('absolute'); // 'absolute' or 'percentage'
  const [activeCategory, setActiveCategory] = useState('all');
  const [highlightedMaterial, setHighlightedMaterial] = useState(null);

  const getColorScheme = useCallback(() => {
    // Main category colors
    const categoryColors = {
      'Landfill': '#1e3a8a', // Dark blue
      'Recycling': '#0891b2', // Cyan
      'Compost': '#76c893',  // Green
      'Reuse': '#8b5cf6'     // Purple
    };
    
    return categoryColors;
  }, []);

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      d3.select(svgRef.current).selectAll('*').remove();

      const actualData = typeof data === 'function' ? data(year) : data;
      
      if (!actualData || !actualData.nodes || !actualData.links || actualData.nodes.length === 0) {
        const svg = d3.select(svgRef.current);
        svg.append('text')
          .attr('x', svgRef.current.clientWidth / 2)
          .attr('y', 100)
          .attr('text-anchor', 'middle')
          .text('No data available for the selected criteria');
        return;
      }

      const categoryColors = getColorScheme();
      
      const margin = { top: 40, right: 120, bottom: 100, left: 150 };
      const width = svgRef.current.clientWidth - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;
      
      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
      // Process the data to create stacked format
      const materialTypes = new Set();
      const categoryData = {};
      
      // Get material types and initialize categories
      actualData.links.forEach(link => {
        const material = actualData.nodes[link.source].name;
        const category = actualData.nodes[link.target].name;
        
        if (actualData.nodes[link.source].type === 'material' &&
            actualData.nodes[link.target].type === 'category') {
          materialTypes.add(material);
          
          if (!categoryData[material]) {
            categoryData[material] = {
              'Landfill': 0,
              'Recycling': 0,
              'Compost': 0,
              'Reuse': 0
            };
          }
          
          categoryData[material][category] += link.value;
        }
      });
      
      // Filter based on active category if needed
      let filteredMaterials = Array.from(materialTypes);
      const categoryFilter = activeCategory || selectedCategory;
      
      if (categoryFilter && categoryFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
          categoryData[material][categoryFilter] > 0
        );
      }
      
      // Sort materials by total weight
      const sortedMaterials = filteredMaterials.sort((a, b) => {
        const totalA = Object.values(categoryData[a]).reduce((sum, val) => sum + val, 0);
        const totalB = Object.values(categoryData[b]).reduce((sum, val) => sum + val, 0);
        return totalB - totalA;
      });
      
      // Get top 10 materials for better visualization
      const topMaterials = sortedMaterials.slice(0, 10);
      
      // Prepare data for stacked bar chart
      const stackData = topMaterials.map(material => {
        const total = Object.values(categoryData[material]).reduce((sum, val) => sum + val, 0);
        
        // Calculate percentages for each category
        const percentages = {};
        Object.keys(categoryData[material]).forEach(cat => {
          percentages[cat] = (categoryData[material][cat] / total) * 100;
        });
        
        return {
          material,
          total,
          percentages,
          ...categoryData[material]
        };
      });
      
      // Define scales
      const x0Scale = d3.scaleBand()
        .domain(stackData.map(d => d.material))
        .range([0, width])
        .padding(0.2);
        
      const maxValue = viewMode === 'absolute' 
        ? d3.max(stackData, d => d.total)
        : 100; // For percentage view, max is always 100%
      
      const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0])
        .nice();
      
      // Draw axes
      const xAxis = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0Scale))
        .selectAll('text')
          .attr('transform', 'rotate(-45)')
          .attr('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '.15em')
          .style('font-size', '11px')
          .style('cursor', 'pointer')
          .on('click', function(event, d) {
            // Toggle highlight when clicking material label
            setHighlightedMaterial(highlightedMaterial === d ? null : d);
          })
          .style('font-weight', d => highlightedMaterial === d ? 'bold' : 'normal');
      
      const yAxisFormat = viewMode === 'absolute'
        ? d => d3.format('.1s')(d) + ' lbs'
        : d => d3.format('.0f')(d) + '%';
      
      svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale).ticks(10).tickFormat(yAxisFormat));
      
      // Create stacks for each category
      const categories = ['Landfill', 'Recycling', 'Compost', 'Reuse'].filter(
        cat => !categoryFilter || categoryFilter === 'all' || cat === categoryFilter
      );
      
      // Draw stacked bars for each material
      stackData.forEach(d => {
        let y0 = 0; // starting point for each stack
        let y0Percent = 0; // starting point for percentage view
        
        // Determine if this material should be highlighted
        const isHighlighted = highlightedMaterial === d.material;
        const barOpacity = highlightedMaterial ? (isHighlighted ? 1 : 0.3) : 1;
        
        categories.forEach(category => {
          const value = d[category];
          const percentage = d.percentages[category];
          
          // Skip if no value
          if (!value) return;
          
          // Use either absolute values or percentages based on view mode
          const yValue = viewMode === 'absolute' ? y0 + value : y0Percent + percentage;
          const height = viewMode === 'absolute' 
            ? yScale(y0) - yScale(y0 + value)
            : yScale(y0Percent) - yScale(y0Percent + percentage);
          
          // Create bar with animated transition
          const rect = svg.append('rect')
            .attr('class', `bar ${d.material.replace(/\s+/g, '-').toLowerCase()} ${category.toLowerCase()}`)
            .attr('x', x0Scale(d.material))
            .attr('y', yScale(yValue))
            .attr('height', height)
            .attr('width', x0Scale.bandwidth())
            .attr('fill', categoryColors[category])
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', barOpacity);
            
          // Add hover effects
          rect.on('mouseover', function(event) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', Math.min(barOpacity + 0.2, 1))
              .attr('stroke-width', 2);
            
            const displayValue = viewMode === 'absolute'
              ? `${d3.format(',')(Math.round(value))} lbs (${d3.format('.1f')(percentage)}%)`
              : `${d3.format('.1f')(percentage)}% (${d3.format(',')(Math.round(value))} lbs)`;
            
            setTooltip({
              visible: true,
              x: event.pageX,
              y: event.pageY,
              content: `<strong>${d.material}</strong><br>${category}: ${displayValue}`
            });
          })
          .on('mouseout', function() {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('opacity', barOpacity)
              .attr('stroke-width', 1);
            
            setTooltip({ ...tooltip, visible: false });
          })
          .on('click', function() {
            // Set material as highlighted on click
            setHighlightedMaterial(d.material === highlightedMaterial ? null : d.material);
          });
          
          // Update for next stack
          y0 += value;
          y0Percent += percentage;
        });
      });

      // Add X axis label
      svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom / 2)
        .attr('class', 'axis-label')
        .text('Material Type');

      // Add Y axis label
      svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left / 1.5)
        .attr('x', -height / 2)
        .attr('class', 'axis-label')
        .text(viewMode === 'absolute' ? 'Weight (lbs)' : 'Percentage (%)');
      
      // Add title with year
      svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(`Material Distribution ${year ? `(${year})` : ''}`);
      
      // Add legend
      const legend = svg.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .attr('text-anchor', 'start')
        .selectAll('g')
        .data(categories)
        .enter().append('g')
        .attr('transform', (d, i) => `translate(0,${i * 20})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          // Filter by category when clicking legend
          handleCategoryChange(activeCategory === d ? 'all' : d);
        });

      legend.append('rect')
        .attr('x', width + 10)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => categoryColors[d])
        .attr('stroke', d => activeCategory === d ? '#000' : 'none')
        .attr('stroke-width', 2);

      legend.append('text')
        .attr('x', width + 30)
        .attr('y', 7.5)
        .attr('dy', '0.32em')
        .text(d => d)
        .style('font-weight', d => activeCategory === d ? 'bold' : 'normal');
        
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [data, year, selectedCategory, activeCategory, highlightedMaterial, viewMode, getColorScheme]);

  // Render category buttons and view mode toggle
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '600px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: 1 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button 
            onClick={() => handleCategoryChange('all')}
            variant={activeCategory === 'all' ? 'contained' : 'outlined'}
          >
            All
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
        
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
        >
          <ToggleButton value="absolute">
            Weight (lbs)
          </ToggleButton>
          <ToggleButton value="percentage">
            Percentage (%)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {highlightedMaterial && (
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Highlighting: {highlightedMaterial} 
          <Button 
            size="small" 
            variant="text" 
            onClick={() => setHighlightedMaterial(null)}
            sx={{ ml: 1, p: 0, minWidth: 'auto' }}
          >
            Clear
          </Button>
        </Typography>
      )}
      
      <svg ref={svgRef} width="100%" height="500" />
      
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

export default MaterialDistributionChart; 