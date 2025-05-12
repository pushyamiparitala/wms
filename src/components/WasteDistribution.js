import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

const WasteDistribution = ({ data, year }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [selectedType, setSelectedType] = useState(null);

  // Modern color palette matching the rest of the dashboard
  const colorMap = {
    'Landfill': '#3d5a80', // Deep blue
    'Recycle': '#48cae4', // Bright blue
    'Recycling': '#48cae4', // Bright blue (alias)
    'Compost': '#76c893'  // Green
  };

  // Material color scale
  const materialColorScale = d3.scaleOrdinal()
    .range([
      '#f9844a', '#f9c74f', '#f94144', '#90be6d', 
      '#43aa8b', '#4d908e', '#577590', '#f8961e', 
      '#f3722c', '#277da1', '#adb5bd'
    ]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Process data - use the actual data if provided, or generate sample data
    const processedData = typeof data === 'function' ? data(year) : data;
    
    if (!processedData || processedData.length === 0) {
      // Display a message if no data
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.append('text')
        .attr('x', svgRef.current.clientWidth / 2)
        .attr('y', 100)
        .attr('text-anchor', 'middle')
        .text('No data available for the selected criteria');
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set dimensions
    const margin = { top: 40, right: 30, bottom: 40, left: 40 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Preprocess data for treemap
    const root = d3.hierarchy({ children: processedData })
      .sum(d => d.totalWeight || 0)
      .sort((a, b) => b.value - a.value);

    // Create treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .paddingOuter(10)
      .paddingInner(3)
      .round(true);

    // Generate treemap data
    treemap(root);
    
    // Add chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Waste Distribution by Material Type');

    // Create groups for each treemap cell
    const cell = svg.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .attr('class', 'material-cell')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedType(selectedType === d.data.name ? null : d.data.name);
      });

    // Add rectangles for each cell
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', d => {
        // Use material color or determine color by main category
        if (d.data.categories) {
          // Find the main category by weight
          const mainCategory = d.data.categories
            .sort((a, b) => b.value - a.value)[0]?.name;
          return colorMap[mainCategory] || materialColorScale(d.data.name);
        }
        return materialColorScale(d.data.name);
      })
      .attr('opacity', d => selectedType && d.data.name !== selectedType ? 0.3 : 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        // Highlight cell on hover
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2);
        
        // Create tooltip content
        let tooltipContent = `<div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white;">
          <strong>${d.data.name}</strong><br>
          ${d3.format(',')(d.value)} lbs<br>`;
          
        // Add category breakdown if available
        if (d.data.categories && d.data.categories.length > 0) {
          tooltipContent += `<br><u>Category breakdown:</u><br>`;
          d.data.categories.forEach(cat => {
            const percent = ((cat.value / d.value) * 100).toFixed(1);
            tooltipContent += `${cat.name}: ${d3.format(',')(cat.value)} lbs (${percent}%)<br>`;
          });
        }
        
        tooltipContent += `</div>`;
        
        // Set tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: tooltipContent
        });
      })
      .on('mouseout', function() {
        // Reset highlight
        d3.select(this)
          .attr('opacity', d => selectedType && d.data.name !== selectedType ? 0.3 : 0.85)
          .attr('stroke-width', 1);
        
        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

    // Add text labels
    cell.append('text')
      .attr('x', 5)
      .attr('y', 15)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#fff')
      .style('text-shadow', '1px 1px 1px rgba(0,0,0,0.5)')
      .text(d => {
        // Truncate text if it's too long for the cell
        const cellWidth = d.x1 - d.x0;
        let name = d.data.name;
        if (name.length * 7 > cellWidth) {
          name = name.substring(0, Math.floor(cellWidth / 7) - 3) + '...';
        }
        return name;
      });
    
    // Add weight values
    cell.append('text')
      .attr('x', 5)
      .attr('y', 30)
      .style('font-size', '11px')
      .style('fill', '#fff')
      .style('text-shadow', '1px 1px 1px rgba(0,0,0,0.5)')
      .text(d => {
        const cellWidth = d.x1 - d.x0;
        // Only show weight if cell is wide enough
        if (cellWidth < 100) return '';
        return `${(d.value / 1000).toFixed(1)}k lbs`;
      });
    
    // Add category indicators
    cell.each(function(d) {
      // Skip if no categories or cell too small
      if (!d.data.categories || d.data.categories.length === 0 || (d.x1 - d.x0) < 80) return;
      
      const g = d3.select(this);
      const categories = d.data.categories.sort((a, b) => b.value - a.value);
      
      // Only show top 3 categories
      categories.slice(0, 3).forEach((cat, i) => {
        g.append('circle')
          .attr('cx', 10 + (i * 15))
          .attr('cy', 45)
          .attr('r', 5)
          .attr('fill', colorMap[cat.name] || '#aaa');
      });
    });
    
    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 140}, ${height - 80})`);

    // Category legend
    const categories = ['Landfill', 'Recycling', 'Compost'];
    categories.forEach((category, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 2)
        .attr('ry', 2)
        .attr('fill', colorMap[category]);
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(category);
    });
    
    // Add note
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-style', 'italic')
      .style('fill', '#666')
      .text('Click on a material to focus or see details');

  }, [data, year, selectedType, colorMap, materialColorScale]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '500px' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      {tooltip.visible && (
        <div 
          style={{
            position: 'fixed',
            top: tooltip.y - 10,
            left: tooltip.x + 10,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </Box>
  );
};

export default WasteDistribution; 