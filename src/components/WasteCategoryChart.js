import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

const WasteCategoryChart = ({ data, year, selectedCategory, onCategorySelect }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!svgRef.current) return;

    try {
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      // Check if data is a function and execute it with the year parameter
      const actualData = typeof data === 'function' ? data(year) : data;
      
      // Safety check - if no data is available, show message and exit
      if (!actualData || !actualData.length === 0) {
        const svg = d3.select(svgRef.current);
        svg.append('text')
          .attr('x', svgRef.current.clientWidth / 2)
          .attr('y', 100)
          .attr('text-anchor', 'middle')
          .text('No data available for the selected criteria');
        return;
      }

      // Define color scheme
      const categoryColors = {
        'Landfill': '#3d5a80', // Deep blue for landfill
        'Recycling': '#48cae4', // Bright blue for recycling
        'Recycle': '#48cae4',   // Alias for recycling
        'Compost': '#76c893'    // Green for compost
      };
      
      // Material colors with a vibrant scheme
      const materialColors = d3.scaleOrdinal()
        .range([
          '#f9844a', '#f9c74f', '#f94144', '#adb5bd', 
          '#90be6d', '#43aa8b', '#4d908e', '#577590', 
          '#f8961e', '#f3722c', '#277da1'
        ]);
      
      // Set dimensions
      const margin = { top: 30, right: 30, bottom: 30, left: 30 };
      const width = svgRef.current.clientWidth - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;

      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Process data for visualization
      // Extract unique categories and material types
      const categories = Array.from(new Set(actualData.map(d => d.Category === 'Recycle' ? 'Recycling' : d.Category)));
      const materialTypes = Array.from(new Set(actualData.map(d => d.MaterialType)));
      
      // Create nodes for categories and materials
      const nodes = [
        ...categories.map(name => ({ 
          id: name, 
          name, 
          type: 'category',
          value: d3.sum(actualData.filter(d => (d.Category === 'Recycle' ? 'Recycling' : d.Category) === name), d => d.Weight),
          radius: 30
        })),
        ...materialTypes.map(name => {
          const materialData = actualData.filter(d => d.MaterialType === name);
          return {
            id: name,
            name,
            type: 'material',
            value: d3.sum(materialData, d => d.Weight),
            categories: Array.from(d3.rollup(
              materialData,
              v => d3.sum(v, d => d.Weight),
              d => d.Category === 'Recycle' ? 'Recycling' : d.Category
            ), ([category, weight]) => ({ category, weight })),
            radius: 15
          };
        })
      ];

      // Create links between material types and categories
      const links = [];
      materialTypes.forEach(material => {
        const materialData = actualData.filter(d => d.MaterialType === material);
        const categoryTotals = d3.rollup(
          materialData,
          v => d3.sum(v, d => d.Weight),
          d => d.Category === 'Recycle' ? 'Recycling' : d.Category
        );
        
        categoryTotals.forEach((weight, category) => {
          links.push({
            source: material,
            target: category,
            value: weight
          });
        });
      });

      // Calculate max link value for scaling
      const maxLinkValue = d3.max(links, d => d.value);
      
      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 10));

      // Create links with variable thickness based on value
      const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke-width', d => Math.max(1, 10 * d.value / maxLinkValue))
        .attr('stroke', d => {
          // Get color based on target category
          return categoryColors[d.target] || '#aaa';
        })
        .attr('stroke-opacity', 0.6)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          // Highlight link on hover
          d3.select(this)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', d => Math.max(3, 10 * d.value / maxLinkValue));
          
          // Show tooltip
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: `
              <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white;">
                <strong>${d.source.name} → ${d.target}</strong><br>
                ${d3.format(',')(d.value)} lbs
              </div>
            `
          });
        })
        .on('mouseout', function() {
          // Reset link on mouseout
          d3.select(this)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.max(1, 10 * d.value / maxLinkValue));
          
          setTooltip({ visible: false, x: 0, y: 0, content: '' });
        });

      // Create nodes
      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('cursor', 'pointer')
        .attr('class', d => `node ${d.type}`)
        .on('click', function(event, d) {
          // Toggle selection
          if (selectedNode === d.id) {
            setSelectedNode(null);
            onCategorySelect && onCategorySelect('all');
            
            // Reset all opacities
            svg.selectAll('.node').transition().duration(300).style('opacity', 1);
            svg.selectAll('line').transition().duration(300).style('opacity', 1);
          } else {
            setSelectedNode(d.id);
            if (d.type === 'category') {
              onCategorySelect && onCategorySelect(d.id);
            }
            
            // Dim unrelated nodes and links
            const connectedNodeIds = new Set();
            connectedNodeIds.add(d.id);
            
            // Find connected nodes
            links.forEach(link => {
              if (link.source.id === d.id || link.target === d.id) {
                connectedNodeIds.add(link.source.id);
                connectedNodeIds.add(link.target);
              }
            });
            
            // Apply highlighting
            svg.selectAll('.node').transition().duration(300)
              .style('opacity', node => connectedNodeIds.has(node.id) ? 1 : 0.2);
              
            svg.selectAll('line').transition().duration(300)
              .style('opacity', link => 
                connectedNodeIds.has(link.source.id) && connectedNodeIds.has(link.target) ? 1 : 0.1
              );
          }
        })
        .on('mouseover', function(event, d) {
          // Show tooltip
          let tooltipContent = `
            <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 6px; color: white;">
              <strong>${d.name}</strong><br>
              ${d3.format(',')(d.value)} lbs
          `;
          
          // Add category breakdown for material nodes
          if (d.type === 'material' && d.categories) {
            tooltipContent += `<br><br><u>Category breakdown:</u><br>`;
            d.categories.forEach(cat => {
              const percent = ((cat.weight / d.value) * 100).toFixed(1);
              tooltipContent += `${cat.category}: ${d3.format(',')(cat.weight)} lbs (${percent}%)<br>`;
            });
          }
          
          tooltipContent += `</div>`;
          
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: tooltipContent
          });
        })
        .on('mouseout', function() {
          setTooltip({ visible: false, x: 0, y: 0, content: '' });
        })
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Add circles for nodes with different styles based on type
      node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => {
          if (d.type === 'category') {
            return categoryColors[d.name] || '#aaa';
          } else {
            // For materials, use a color based on its primary category
            if (d.categories && d.categories.length > 0) {
              const primaryCategory = d.categories.sort((a, b) => b.weight - a.weight)[0].category;
              return d3.color(categoryColors[primaryCategory] || materialColors(d.name)).brighter(0.5);
            }
            return materialColors(d.name);
          }
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Add labels to nodes
      node.append('text')
        .attr('dy', d => d.type === 'category' ? 5 : 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', d => d.type === 'category' ? '14px' : '10px')
        .attr('fill', d => d.type === 'category' ? '#fff' : '#333')
        .attr('pointer-events', 'none')
        .text(d => {
          // Truncate long material names
          if (d.type === 'material' && d.name.length > 15) {
            return d.name.substring(0, 12) + '...';
          }
          return d.name;
        });

      // Add animation tick function
      simulation.on('tick', () => {
        // Constrain nodes to visible area
        nodes.forEach(d => {
          d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
          d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
        });
        
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => typeof d.target === 'object' ? d.target.x : nodes.find(n => n.id === d.target).x)
          .attr('y2', d => typeof d.target === 'object' ? d.target.y : nodes.find(n => n.id === d.target).y);

        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Add legend
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 20)`);

      // Category colors
      Object.entries(categoryColors).forEach(([category, color], i) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * 25})`);
        
        legendItem.append('rect')
          .attr('width', 18)
          .attr('height', 18)
          .attr('rx', 3)
          .attr('fill', color);
        
        legendItem.append('text')
          .attr('x', 24)
          .attr('y', 12)
          .attr('font-size', '12px')
          .text(category);
      });

      // Add a title for the legend
      legend.append('text')
        .attr('y', -10)
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text('Categories');

      // Add Material/Category type legend
      const typeLegend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(20, 20)`);

      // Node types
      const nodeTypes = [
        { name: 'Category', radius: 15, color: '#aaa' },
        { name: 'Material Type', radius: 8, color: '#bbb' }
      ];

      nodeTypes.forEach((type, i) => {
        const legendItem = typeLegend.append('g')
          .attr('transform', `translate(0, ${i * 25})`);
        
        legendItem.append('circle')
          .attr('r', type.radius * 0.6)
          .attr('cx', 9)
          .attr('cy', 9)
          .attr('fill', type.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        
        legendItem.append('text')
          .attr('x', 24)
          .attr('y', 12)
          .attr('font-size', '12px')
          .text(type.name);
      });

      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Waste Category and Material Type Relationships');

      // Add interaction hint
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-style', 'italic')
        .attr('fill', '#666')
        .text('Click on nodes to explore relationships. Drag nodes to rearrange.');

      // Define drag functions
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
      console.error('Error rendering waste category chart:', error);
    }
  }, [data, year, selectedCategory, selectedNode, onCategorySelect]);

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

export default WasteCategoryChart; 