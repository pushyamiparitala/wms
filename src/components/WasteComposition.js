import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Typography, Box } from '@mui/material';

const WasteComposition = ({ data, year, onCategorySelect }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  // Modern color palette for waste types
  const colorScale = d3.scaleOrdinal()
    .domain(['Landfill', 'Recycling', 'Compost'])
    .range(['#3d5a80', '#48cae4', '#76c893']);

  useEffect(() => {
    if (!data || !year || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set dimensions
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create hierarchy
    const processedData = typeof data === 'function' ? data(year) : { name: 'No Data', children: [] };
    const root = d3.hierarchy(processedData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    // Create treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(19)
      .paddingInner(2)
      .round(true);

    treemap(root);

    // Create a parent group for each category
    const categories = svg.selectAll('g.category')
      .data(root.children)
      .enter()
      .append('g')
      .attr('class', 'category')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onCategorySelect) {
          onCategorySelect(d.data.name);
        }
      });

    // Add labels to categories
    categories.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', 20)
      .attr('fill', d => colorScale(d.data.name))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('rx', 4)
      .attr('ry', 4);

    categories.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', '#fff')
      .attr('font-weight', 'bold')
      .attr('font-size', '0.85em')
      .text(d => `${d.data.name} (${d3.format('.1f')(d.value / 1000)}k lbs)`);

    // Create cells for each leaf node
    const leaf = categories.selectAll('g.leaf')
      .data(d => d.leaves())
      .enter()
      .append('g')
      .attr('class', 'leaf')
      .attr('transform', d => `translate(${d.x0 - d.parent.x0},${d.y0 - d.parent.y0 + 20})`)
      .on('mouseover', (event, d) => {
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: `${d.data.name}<br>${d3.format(',')(d.value)} lbs<br>${d3.format('.1%')(d.value / d.parent.value)} of ${d.parent.data.name}`
        });
      })
      .on('mouseout', () => {
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      });

    // Add rectangles
    leaf.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => {
        // Get the base color from parent
        const baseColor = colorScale(d.parent.data.name);
        // Create a slightly darker or lighter variant
        const color = d3.color(baseColor);
        
        // Adjust the color slightly based on the value
        const valueScale = d3.scaleLinear()
          .domain([0, d3.max(d.parent.leaves(), leaf => leaf.value)])
          .range([0.8, 1.2]);
          
        color.opacity = 0.8;
        return d3.rgb(
          color.r * valueScale(d.value), 
          color.g * valueScale(d.value), 
          color.b * valueScale(d.value)
        );
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('opacity', 0.9)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 1).attr('stroke-width', 2);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.9).attr('stroke-width', 1);
      });

    // Add text labels for larger cells
    leaf.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('font-size', '0.7em')
      .attr('fill', '#fff')
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only display text if the cell is large enough
        return width > 60 && height > 25 ? d.data.name : '';
      });

    // Add value labels for larger cells
    leaf.append('text')
      .attr('x', 4)
      .attr('y', 26)
      .attr('font-size', '0.65em')
      .attr('fill', '#fff')
      .attr('opacity', 0.9)
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only display text if the cell is large enough
        return width > 60 && height > 40 ? `${d3.format('.1f')(d.value / 1000)}k lbs` : '';
      });

  }, [data, year, colorScale, onCategorySelect]);

  return (
    <>
      <Typography 
        variant="h5" 
        gutterBottom 
        color="primary"
        sx={{ 
          fontWeight: 'bold',
          borderBottom: '2px solid #eaeaea',
          paddingBottom: 1
        }}
      >
        Waste Composition by Type
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Click on a category to filter the network diagram
      </Typography>
      <Box sx={{ position: 'relative', width: '100%', height: '400px' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        {tooltip.visible && (
          <div 
            style={{
              position: 'fixed',
              top: tooltip.y - 40,
              left: tooltip.x + 15,
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 1000,
              fontSize: '12px',
              lineHeight: '1.4',
              maxWidth: '200px'
            }}
            dangerouslySetInnerHTML={{ __html: tooltip.content }}
          />
        )}
      </Box>
    </>
  );
};

export default WasteComposition; 