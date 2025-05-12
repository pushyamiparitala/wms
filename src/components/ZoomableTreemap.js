import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import treeData from './treemap_data.json';

// Treemap component
const ZoomableTreemap = () => {
  const svgRef = useRef();
  const [currentNode, setCurrentNode] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Set up dimensions and margins
    const width = 900;
    const height = 600;
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create title
    svg.append('text')
      .attr('class', 'title')
      .attr('x', (width - margin.left - margin.right) / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Hierarchical Waste Composition');
    
    // Create color scales
    const categoryColors = {
      'Compost in Landfill': '#76c893',  // Green
      'Landfill': '#1e3a8a',            // Dark blue
      'Recycling in Landfill': '#0891b2', // Cyan
      'Compost': '#4caf50',              // Green
      'Landfill in Compost': '#64748b',  // Slate
      'Liquids in Landfill': '#3b82f6',  // Blue
      'Recycling': '#0ea5e9',            // Light blue
      'Landfill in Recycling': '#64748b', // Slate
      'Compost in Recycling': '#76c893'   // Green
    };
    
    const materialColors = {
      'BOH Food Waste': '#4caf50',
      'FOH Food Waste': '#81c784',
      'Compostable Serviceware': '#a5d6a7',
      'Misc Compost': '#c8e6c9',
      'Misc Landfill': '#64748b',
      'Misc Recycling': '#0ea5e9',
      'Recycable Beverage Containers': '#38bdf8',
      'Surplus/Expired Food': '#fb923c',
      'Liquids': '#60a5fa'
    };
    
    // Process the data
    const root = d3.hierarchy(treeData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    // Create treemap layout
    const treemap = d3.treemap()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .paddingOuter(4)
      .paddingTop(20)
      .paddingInner(2)
      .round(true);
    
    // Apply the treemap layout
    treemap(root);
    
    // Determine which node to display
    const nodeToDisplay = currentNode || root;
    
    // Filter out nodes to display based on current zoom level
    const nodes = nodeToDisplay.descendants()
      .filter(d => d.depth >= nodeToDisplay.depth && d.depth <= nodeToDisplay.depth + 1);
    
    // Draw cells
    const cell = svg.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .attr('class', 'cell');
    
    // Add rectangles for each cell
    cell.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => {
        if (d.depth === 1) return categoryColors[d.data.name] || '#ccc';
        if (d.depth === 2) return materialColors[d.data.name] || '#aaa';
        return '#ddd';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', d => d.depth <= 2 ? 'pointer' : 'default')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.depth <= 2) {
          setCurrentNode(currentNode === d ? d.parent : d);
        }
      })
      .on('mouseover', (event, d) => {
        // Highlight on hover
        d3.select(event.currentTarget)
          .attr('stroke', '#000')
          .attr('stroke-width', 2);
        
        // Show tooltip
        const value = d.value;
        const percentage = (value / root.value) * 100;
        let tooltipContent = `<strong>${d.data.name}</strong><br>`;
        tooltipContent += `Weight: ${value.toFixed(1)} lb (${percentage.toFixed(1)}%)`;
        
        if (d.depth === 2) {
          tooltipContent += `<br>Stream: ${d.parent.data.name}`;
        }
        
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: tooltipContent
        });
      })
      .on('mousemove', (event) => {
        setTooltip(prev => ({
          ...prev,
          x: event.pageX,
          y: event.pageY
        }));
      })
      .on('mouseout', (event) => {
        // Reset highlight
        d3.select(event.currentTarget)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        
        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });
    
    // Add labels for each cell
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', d => d.depth === 1 ? '#fff' : '#000')
      .attr('font-weight', d => d.depth === 1 ? 'bold' : 'normal')
      .attr('font-size', d => d.depth === 1 ? '12px' : '10px')
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        
        // Only show text if there's enough space
        if (width < 40 || height < 20) return '';
        
        // Show abbreviated text for small cells
        if (width < 80) {
          return d.data.name.substring(0, 8) + '...';
        }
        
        return d.data.name;
      });
    
    // Add weight values for each cell
    cell.append('text')
      .attr('x', 4)
      .attr('y', 28)
      .attr('fill', d => d.depth === 1 ? '#fff' : '#000')
      .attr('font-size', '9px')
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        
        // Only show value if there's enough space
        if (width < 60 || height < 30) return '';
        
        return `${d.value.toFixed(1)} lb`;
      });
    
    // Add navigation if zoomed in
    if (currentNode && currentNode !== root) {
      svg.append('text')
        .attr('x', 5)
        .attr('y', -10)
        .attr('font-size', '12px')
        .attr('cursor', 'pointer')
        .text('« Back to Overview')
        .on('click', () => setCurrentNode(root));
    }
    
    // Add insight text below chart
    if (!currentNode || currentNode === root) {
      svg.append('text')
        .attr('x', 0)
        .attr('y', height - margin.top - 5)
        .attr('font-size', '14px')
        .attr('font-style', 'italic')
        .text('Insight: The treemap reveals that BOH Food Waste is the largest component of compostable waste being sent to landfill,');
      
      svg.append('text')
        .attr('x', 0)
        .attr('y', height - margin.top + 15)
        .attr('font-size', '14px')
        .attr('font-style', 'italic')
        .text('suggesting kitchen waste practices should be a priority focus area.');
    }
    
  }, [currentNode]);
  
  return (
    <div style={{ position: 'relative', width: '900px', margin: '0 auto' }}>
      <svg ref={svgRef} width="900" height="600"></svg>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            top: tooltip.y - 150,
            left: tooltip.x,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '200px'
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default ZoomableTreemap;