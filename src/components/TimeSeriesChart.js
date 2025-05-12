import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

const TimeSeriesChart = ({ data, selectedYear, setSelectedYear }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [processedData, setProcessedData] = useState(null);

  // Process raw data into time series format
  useEffect(() => {
    if (!data) return;
    
    try {
      // Group data by year and category
      const groupedByYear = {};
      data.forEach(d => {
        const year = d.Year;
        const category = d.Category;
        const weight = typeof d.Weight === 'number' ? d.Weight : parseFloat(d['Weight (lbs)'] || 0);
        
        if (!groupedByYear[year]) {
          groupedByYear[year] = { 
            year: +year, 
            landfill: 0, 
            recycling: 0, 
            compost: 0 
          };
        }
        
        if (category.toLowerCase().includes('landfill')) {
          groupedByYear[year].landfill += weight;
        } else if (category.toLowerCase().includes('recycl')) {
          groupedByYear[year].recycling += weight;
        } else if (category.toLowerCase().includes('compost')) {
          groupedByYear[year].compost += weight;
        }
      });
      
      // Convert to array sorted by year
      const timeSeriesData = Object.values(groupedByYear).sort((a, b) => a.year - b.year);
      console.log('Processed time series data:', timeSeriesData);
      setProcessedData(timeSeriesData);
    } catch (error) {
      console.error('Error processing time series data:', error);
    }
  }, [data]);

  useEffect(() => {
    if (!processedData || !svgRef.current || processedData.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define consistent color palette 
    const colors = {
      landfill: '#1e3a8a',  // Dark blue for landfill
      recycling: '#48cae4', // Light blue for recycling
      compost: '#76c893'    // Green for compost
    };

    // Create stack generator
    const keys = ['compost', 'recycling', 'landfill'];
    const stack = d3.stack()
      .keys(keys)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetWiggle);  // Use wiggle offset for stream graph

    // Apply stack to data
    const stackedData = stack(processedData);

    // Create scales
    const x = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.year))
      .range([0, width]);

    // Y scale depends on stacked data
    const y = d3.scaleLinear()
      .domain([
        d3.min(stackedData, layer => d3.min(layer, d => d[0])),
        d3.max(stackedData, layer => d3.max(layer, d => d[1]))
      ])
      .range([height, 0]);

    // Create area generator
    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);  // Use basis for smoothing

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .ticks(10)
        .tickSize(-height)
        .tickFormat('')
      )
      .attr('color', '#eaeaea')
      .attr('stroke-opacity', 0.5)
      .selectAll('line')
      .attr('stroke-dasharray', '3,3');

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .ticks(10)
        .tickSize(-width)
        .tickFormat('')
      )
      .attr('color', '#eaeaea')
      .attr('stroke-opacity', 0.5)
      .selectAll('line')
      .attr('stroke-dasharray', '3,3');

    // Add X axis with better visibility
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .ticks(Math.min(processedData.length, 10))
        .tickFormat(d3.format('d')))
      .selectAll('text')
      .attr('transform', 'translate(-10,10)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333');

    // Add Y axis with better visibility
    svg.append('g')
      .call(d3.axisLeft(y)
        .ticks(10)
        .tickFormat(d => `${Math.abs(d)/1000}k`))
      .selectAll('text')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#333');

    // Add Y axis label with better visibility
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .attr('dy', '1em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Weight (pounds)');

    // Add X axis label with better visibility
    svg.append('text')
      .attr('transform', `translate(${width/2}, ${height + margin.bottom - 15})`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Year');

    // Add chart title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Waste Generation Trends');

    // Add stream areas with transition
    const streamPaths = svg.selectAll('.stream')
      .data(stackedData)
      .enter()
      .append('path')
      .attr('class', 'stream')
      .attr('d', area)
      .attr('fill', (d, i) => colors[keys[i]])
      .attr('stroke', 'white')
      .attr('opacity', 0.8)
      .attr('stroke-width', 0.5)
      .attr('stroke-linejoin', 'round')
      .style('opacity', 0)
      .on('mouseover', function(event, d) {
        // Highlight this stream
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 1)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        
        // Get data for tooltip
        const key = keys[d.index];
        const yearData = processedData.map(yearObj => ({
          year: yearObj.year,
          value: yearObj[key]
        }));
        
        // Get the x value from the mouse position
        const mouseX = d3.pointer(event)[0];
        const xYear = Math.round(x.invert(mouseX));
        
        // Find the closest data point
        const closestData = yearData.find(item => item.year === xYear) || 
                           yearData.reduce((prev, curr) => 
                             Math.abs(curr.year - xYear) < Math.abs(prev.year - xYear) ? curr : prev);
        
        // Calculate tooltip position
        const xPosition = x(closestData.year);
        const yPosition = y((d.find(p => p.data.year === closestData.year) || { 1: 0 })[1]);
        
        // Show tooltip
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: `
            <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 6px; color: white;">
              <strong>${key.charAt(0).toUpperCase() + key.slice(1)}</strong><br>
              ${d3.format(',')(closestData.value)} lbs (${closestData.year})
              <div style="height: 3px; background: ${colors[key]}; margin-top: 5px;"></div>
            </div>
          `
        });
      })
      .on('mouseout', function() {
        // Reset highlight
        d3.select(this)
          .transition()
          .duration(200)
          .style('opacity', 0.8)
          .attr('stroke', 'white')
          .attr('stroke-width', 0.5);
        
        // Hide tooltip
        setTooltip({ visible: false, x: 0, y: 0, content: '' });
      })
      .on('click', function(event, d) {
        // Get the x value from the click position
        const mouseX = d3.pointer(event)[0];
        const xYear = Math.round(x.invert(mouseX));
        
        // Find the closest year in our data
        const years = processedData.map(d => d.year);
        const closestYear = years.reduce((prev, curr) => 
          Math.abs(curr - xYear) < Math.abs(prev - xYear) ? curr : prev);
        
        // Call the setSelectedYear callback
        setSelectedYear(closestYear);
      });
    
    // Animate stream paths
    streamPaths
      .transition()
      .duration(1000)
      .style('opacity', 0.8);

    // Add a vertical line for the selected year if available
    if (selectedYear) {
      svg.append('line')
        .attr('class', 'selected-year-line')
        .attr('x1', x(selectedYear))
        .attr('x2', x(selectedYear))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', 0.8);
      
      // Add year label
      svg.append('text')
        .attr('x', x(selectedYear))
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(selectedYear)
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', 1);
    }

    // Add legend with improved visibility
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 10}, 0)`);

    Object.keys(colors).forEach((key, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      legendRow.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', colors[key])
        .attr('rx', 3)
        .attr('ry', 3);
      
      legendRow.append('text')
        .attr('x', 25)
        .attr('y', 14)
        .text(key.charAt(0).toUpperCase() + key.slice(1))
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .attr('fill', '#333');
    });

  }, [processedData, selectedYear]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '400px' }}>
      <svg ref={svgRef} width="100%" height="400" />
      
      {tooltip.visible && (
        <div 
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </Box>
  );
};

export default TimeSeriesChart; 