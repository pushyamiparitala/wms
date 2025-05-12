import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

const ForceDirectedGraph = ({ data, year }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [selectedNode, setSelectedNode] = useState(null);

  // Define color scheme
  const getColorScheme = useCallback(() => {
    const streamColors = {
      'Stream': '#76c893', // Green for stream nodes
      'Substream': '#48cae4'  // Blue for substream nodes
    };
    
    // Main category colors
    const categoryColors = {
      'Landfill': '#1e3a8a', // Dark blue for landfill
      'Recycling': '#48cae4', // Light blue for recycling
      'Compost': '#76c893',  // Green for compost
    };
    
    // Material type colors
    const materialColors = {
      'Liquids': '#f4c95d', // Yellow for liquids
      'Liquids in Landfill': '#adb5bd', // Grey for liquids in landfill
      'BOH Food Waste': '#5465ff', // Blue for BOH food waste  
      'FOH Food Waste': '#ff7b00', // Orange for FOH food waste
      'Recyclable Beverage Containers': '#ff9e00', // Orange for recyclable containers
      'Compostable Serviceware': '#7cb518', // Green for compostable serviceware
      'Misc Compost': '#e63946', // Red for misc compost
      'Misc Recycling': '#d095e7', // Purple for misc recycling
      'Misc Landfill': '#adb5bd', // Grey for misc landfill
      'Surplus/Expired Food': '#673ab7' // Purple for surplus food
    };
    
    return { streamColors, categoryColors, materialColors };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      // Get color scheme
      const { streamColors, categoryColors, materialColors } = getColorScheme();

      // Set dimensions
      const width = svgRef.current.clientWidth;
      const height = 500;

      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      // Create the data for our network visualization
      const nodeData = [
        // Main categories
        { id: 'Landfill', name: 'Landfill', type: 'stream', size: 20 },
        { id: 'Recycling', name: 'Recycling', type: 'stream', size: 20 },
        { id: 'Compost', name: 'Compost', type: 'stream', size: 20 },
        
        // Misclassified streams
        { id: 'Compost in Recycling', name: 'Compost in Recycling', type: 'substream', size: 15 },
        { id: 'Compost in Landfill', name: 'Compost in Landfill', type: 'substream', size: 15 },
        { id: 'Landfill in Compost', name: 'Landfill in Compost', type: 'substream', size: 15 },
        { id: 'Recycling in Landfill', name: 'Recycling in Landfill', type: 'substream', size: 15 },
        
        // Material substreams
        { id: 'Liquids', name: 'Liquids', type: 'substream', size: 10 },
        { id: 'Liquids in Landfill', name: 'Liquids in Landfill', type: 'substream', size: 10 },
        { id: 'BOH Food Waste', name: 'BOH Food Waste', type: 'substream', size: 10 },
        { id: 'FOH Food Waste', name: 'FOH Food Waste', type: 'substream', size: 10 },
        { id: 'Recyclable Beverage Containers', name: 'Recyclable Beverage Containers', type: 'substream', size: 10 },
        { id: 'Compostable Serviceware', name: 'Compostable Serviceware', type: 'substream', size: 10 },
        { id: 'Misc Compost', name: 'Misc Compost', type: 'substream', size: 10 },
        { id: 'Misc Recycling', name: 'Misc Recycling', type: 'substream', size: 10 },
        { id: 'Misc Landfill', name: 'Misc Landi', type: 'substream', size: 10 },
        { id: 'Surplus/Expired Food', name: 'Surplus/Expired Food', type: 'substream', size: 10 }
      ];
      
      const linkData = [
        // Connections between primary streams and misclassifications
        { source: 'Compost', target: 'Compost in Recycling', value: 15 },
        { source: 'Compost', target: 'Compost in Landfill', value: 35 },
        { source: 'Recycling', target: 'Recycling in Landfill', value: 25 },
        { source: 'Landfill', target: 'Landfill in Compost', value: 10 },
        
        // Connect misclassifications to their destinations
        { source: 'Compost in Recycling', target: 'Recycling', value: 15 },
        { source: 'Compost in Landfill', target: 'Landfill', value: 35 },
        { source: 'Recycling in Landfill', target: 'Landfill', value: 25 },
        { source: 'Landfill in Compost', target: 'Compost', value: 10 },
        
        // Connect substreams to their destinations
        { source: 'Liquids', target: 'Liquids in Landfill', value: 10 },
        { source: 'Liquids in Landfill', target: 'Landfill', value: 10 },
        { source: 'BOH Food Waste', target: 'Compost in Landfill', value: 20 },
        { source: 'FOH Food Waste', target: 'Compost in Landfill', value: 15 },
        { source: 'Recyclable Beverage Containers', target: 'Recycling', value: 20 },
        { source: 'Recyclable Beverage Containers', target: 'Compost', value: 3 },
        { source: 'Compostable Serviceware', target: 'Compost', value: 18 },
        { source: 'Misc Compost', target: 'Compost', value: 15 },
        { source: 'Misc Recycling', target: 'Recycling', value: 10 },
        { source: 'Misc Landfill', target: 'Landfill', value: 15 },
        { source: 'Surplus/Expired Food', target: 'Landfill', value: 12 }
      ];

      // Convert to D3's expected format with objects
      const links = linkData.map(d => ({
        source: nodeData.find(node => node.id === d.source),
        target: nodeData.find(node => node.id === d.target),
        value: d.value
      }));

      // Node color function
      const getNodeColor = node => {
        if (node.type === 'stream') return streamColors['Stream'];
        if (node.type === 'substream') return streamColors['Substream'];
        if (categoryColors[node.name]) return categoryColors[node.name];
        return materialColors[node.name] || '#adb5bd';
      };

      // Create a force simulation
      const simulation = d3.forceSimulation(nodeData)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size * 2));

      // Draw links first so they appear behind the nodes
      const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke-width', d => Math.sqrt(d.value) / 2)
        .attr('stroke', '#999')
        .attr('opacity', 0.6);

      // Create node groups
      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodeData)
        .enter()
        .append('g')
        .attr('class', 'node')
        .on('mouseover', function(event, d) {
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: d.name
          });
          
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', d => d.size * 1.2);
        })
        .on('mouseout', function() {
          setTooltip({ ...tooltip, visible: false });
          
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', d => d.size);
        })
        .on('click', function(event, d) {
          // Toggle selected node
          if (selectedNode === d.id) {
            setSelectedNode(null);
            // Reset link opacity
            link.attr('opacity', 0.6);
            node.select('circle').attr('stroke-width', 1);
          } else {
            setSelectedNode(d.id);
            
            // Highlight connected links
            link.attr('opacity', l => 
              (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
            );
            
            // Highlight connected nodes
            node.select('circle')
              .attr('stroke-width', n => 
                (n.id === d.id || 
                links.some(l => 
                  (l.source.id === d.id && l.target.id === n.id) || 
                  (l.target.id === d.id && l.source.id === n.id)
                )) ? 3 : 1
              );
          }
        })
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Add circles to nodes
      node.append('circle')
        .attr('r', d => d.size)
        .attr('fill', getNodeColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);

      // Add text labels to nodes
      node.append('text')
        .text(d => d.name)
        .attr('x', d => d.size + 5)
        .attr('y', 3)
        .style('font-size', '10px')
        .style('pointer-events', 'none');

      // Add legend
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 20)`);

      const legendItems = [
        { type: 'Stream', color: streamColors['Stream'] },
        { type: 'Substream', color: streamColors['Substream'] }
      ];

      legendItems.forEach((item, i) => {
        const legendGroup = legend.append('g')
          .attr('transform', `translate(0, ${i * 25})`);
          
        legendGroup.append('circle')
          .attr('r', 7)
          .attr('fill', item.color);
          
        legendGroup.append('text')
          .attr('x', 15)
          .attr('y', 4)
          .style('font-size', '12px')
          .text(item.type);
      });

      // Update positions on each simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

    } catch (error) {
      console.error('Error rendering force-directed graph:', error);
    }
  }, [year, getColorScheme]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '500px' }}>
      <svg ref={svgRef} width="100%" height="500" />
      
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {tooltip.content}
        </div>
      )}
    </Box>
  );
};

export default ForceDirectedGraph; 