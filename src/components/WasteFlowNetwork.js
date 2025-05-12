import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { Box } from '@mui/material';

const WasteFlowNetwork = ({ data, year, selectedCategory }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [activeNode, setActiveNode] = useState(null);

  const getColorScheme = useCallback(() => {
    const categoryBaseColors = {
      'Landfill': '#1e3a8a',
      'Recycling': '#0891b2',
      'Compost': '#76c893',
      'Reuse': '#8b5cf6'
    };

    const materialColors = {
      'Paper': d3.color(categoryBaseColors['Recycling']).darker(0.3).toString(),
      'Mixed Recycling': d3.color(categoryBaseColors['Recycling']).brighter(0.3).toString(),
      'Confidential Shredding': d3.color(categoryBaseColors['Recycling']).darker(0.5).toString(),
      'Plastic': d3.color(categoryBaseColors['Recycling']).darker(0.1).toString(),
      'Metal': d3.color(categoryBaseColors['Recycling']).darker(0.4).toString(),
      'Glass': d3.color(categoryBaseColors['Recycling']).brighter(0.4).toString(),
      'E-waste': d3.color(categoryBaseColors['Recycling']).darker(0.7).toString(),
      'Food Waste': d3.color(categoryBaseColors['Compost']).darker(0.2).toString(),
      'Yard Waste': d3.color(categoryBaseColors['Compost']).brighter(0.3).toString(),
      'Mixed Organics': d3.color(categoryBaseColors['Compost']).darker(0.4).toString(),
      'Construction & Demolition': d3.color(categoryBaseColors['Landfill']).brighter(0.8).toString(),
      'Other': d3.color(categoryBaseColors['Landfill']).brighter(0.5).toString(),
      'Donations': d3.color(categoryBaseColors['Reuse']).brighter(0.2).toString()
    };

    return { materialColors, categoryBaseColors };
  }, []);

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

      const { materialColors, categoryBaseColors } = getColorScheme();
      
      const nodeColorScale = (node) => {
        if (node.type === 'destination') return categoryBaseColors[node.name] || '#adb5bd';
        return materialColors[node.name] || '#adb5bd';
      };
      
      const margin = { top: 30, right: 120, bottom: 50, left: 150 };
      const width = svgRef.current.clientWidth - margin.left - margin.right;
      const height = 500 - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const destinations = ['Landfill', 'Recycling', 'Compost', 'Reuse'];
      const materials = [
        'Paper',
        'Plastic',
        'Metal',
        'Glass',
        'Food Waste',
        'Yard Waste',
        'Mixed Organics',
        'Construction & Demolition',
        'E-waste',
        'Confidential Shredding',
        'Donations',
        'Mixed Recycling',
        'Other'
      ];

      const simplifiedLabels = {
        'Construction & Demolition': 'Construction',
        'Confidential Shredding': 'Confidential',
        'Mixed Recycling': 'Mixed Recycling',
        'Mixed Organics': 'Mixed Organics',
        'Food Waste': 'Food Waste',
        'Yard Waste': 'Yard Waste'
      };

      const destinationNodes = destinations.map((name, i) => ({
        name,
        displayName: name,
        type: 'destination',
        id: `destination-${name}`,
        index: i
      }));

      const materialNodes = materials.map((name, i) => ({
        name,
        displayName: simplifiedLabels[name] || name,
        type: 'material',
        id: `material-${name}`,
        index: destinationNodes.length + i
      }));

      const nodes = [...destinationNodes, ...materialNodes];

      const defaultLinks = [
        { source: 'material-Paper', target: 'destination-Recycling', value: 150000 },
        { source: 'material-Paper', target: 'destination-Landfill', value: 30000 },
        { source: 'material-Plastic', target: 'destination-Recycling', value: 120000 },
        { source: 'material-Plastic', target: 'destination-Landfill', value: 80000 },
        { source: 'material-Metal', target: 'destination-Recycling', value: 80000 },
        { source: 'material-Metal', target: 'destination-Landfill', value: 10000 },
        { source: 'material-Glass', target: 'destination-Recycling', value: 60000 },
        { source: 'material-Glass', target: 'destination-Landfill', value: 15000 },
        { source: 'material-Food Waste', target: 'destination-Compost', value: 200000 },
        { source: 'material-Food Waste', target: 'destination-Landfill', value: 50000 },
        { source: 'material-Yard Waste', target: 'destination-Compost', value: 180000 },
        { source: 'material-Yard Waste', target: 'destination-Landfill', value: 20000 },
        { source: 'material-Mixed Organics', target: 'destination-Compost', value: 120000 },
        { source: 'material-Mixed Organics', target: 'destination-Landfill', value: 40000 },
        { source: 'material-Construction & Demolition', target: 'destination-Recycling', value: 70000 },
        { source: 'material-Construction & Demolition', target: 'destination-Landfill', value: 130000 },
        { source: 'material-E-waste', target: 'destination-Recycling', value: 30000 },
        { source: 'material-E-waste', target: 'destination-Landfill', value: 5000 },
        { source: 'material-Confidential Shredding', target: 'destination-Recycling', value: 25000 },
        { source: 'material-Donations', target: 'destination-Reuse', value: 35000 },
        { source: 'material-Mixed Recycling', target: 'destination-Recycling', value: 220000 },
        { source: 'material-Mixed Recycling', target: 'destination-Landfill', value: 30000 },
        { source: 'material-Other', target: 'destination-Landfill', value: 100000 }
      ];

      const nodeIdMap = {};
      nodes.forEach(node => {
        nodeIdMap[node.id] = node.index;
      });

      const links = defaultLinks.map(link => ({
        source: nodeIdMap[link.source],
        target: nodeIdMap[link.target],
        value: link.value,
        sourceName: link.source.replace('material-', ''),
        targetName: link.target.replace('destination-', '')
      }));

      const sankeyGenerator = sankey()
        .nodeId(d => d.index)
        .nodeWidth(20)
        .nodePadding(15)
        .extent([[0, 0], [width, height]]);
        
      const sankeyData = sankeyGenerator({
        nodes: JSON.parse(JSON.stringify(nodes)),
        links: JSON.parse(JSON.stringify(links))
      });
      
      const filteredLinks = selectedCategory && selectedCategory !== 'all'
        ? sankeyData.links.filter(l =>
            l.source.name === selectedCategory || 
            l.target.name === selectedCategory
          )
        : sankeyData.links;
        
      const filteredNodeIds = new Set();
      filteredLinks.forEach(link => {
        filteredNodeIds.add(link.source.index);
        filteredNodeIds.add(link.target.index);
      });
      
      const filteredNodes = sankeyData.nodes.filter(node => filteredNodeIds.has(node.index));
      
      const defs = svg.append('defs');
      
      filteredLinks.forEach((link, i) => {
        const sourceColor = nodeColorScale(link.source);
        const targetColor = nodeColorScale(link.target);
        
        const linkGradient = defs.append('linearGradient')
          .attr('id', `link-gradient-${i}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', link.source.x1)
          .attr('y1', (link.source.y0 + link.source.y1) / 2)
          .attr('x2', link.target.x0)
          .attr('y2', (link.target.y0 + link.target.y1) / 2);
          
        linkGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', sourceColor);
          
        linkGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', targetColor);
      });

      const highlightConnections = (node) => {
        if (activeNode === node.index) {
          setActiveNode(null);
          svg.selectAll('.link')
            .transition().duration(300)
            .attr('stroke-opacity', 0.5);
          svg.selectAll('.node')
            .transition().duration(300)
            .style('opacity', 1);
          return;
        }
        
        setActiveNode(node.index);
        
        const connectedLinks = filteredLinks.filter(link =>
          link.source.index === node.index || link.target.index === node.index
        );
        
        const connectedNodes = new Set();
        connectedLinks.forEach(link => {
          connectedNodes.add(link.source.index);
          connectedNodes.add(link.target.index);
        });
        
        svg.selectAll('.link')
          .transition().duration(300)
          .attr('stroke-opacity', link =>
            connectedLinks.includes(link) ? 0.8 : 0.1
          );
          
        svg.selectAll('.node')
          .transition().duration(300)
          .style('opacity', n =>
            connectedNodes.has(n.index) ? 1 : 0.3
          );
      };

      const linkElements = svg.append('g')
        .selectAll('path')
        .data(filteredLinks)
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', (d, i) => `url(#link-gradient-${i})`)
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke-opacity', 0.5)
        .attr('fill', 'none')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-opacity', 0.8);

          const weight = Math.round(d.value).toLocaleString();
          const percentage = Math.round((d.value / d3.sum(links, l => l.value)) * 100);
            
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: `${d.sourceName}: ${weight} lbs (${percentage}%) to ${d.targetName}`
          });
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-opacity', 0.5);

          setTooltip({ ...tooltip, visible: false });
        });

      // Update labels to show waste types instead of flows
      filteredLinks
        .filter(d => d.value > 80000)
        .forEach((link, i) => {
          const x = (link.source.x1 + link.target.x0) / 2;
          const y = (link.source.y0 + link.source.y1) / 2 + (link.target.y0 - link.source.y0) / 2;

          const labelGroup = svg.append('g')
            .attr('class', 'flow-label')
            .attr('pointer-events', 'none');

          const label = labelGroup.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .attr('fill', '#000000') // Black text
            .text(link.sourceName); // Label with waste type only

          const bbox = label.node().getBBox();
          labelGroup.insert('rect', 'text')
            .attr('x', bbox.x - 4)
            .attr('y', bbox.y - 2)
            .attr('width', bbox.width + 8)
            .attr('height', bbox.height + 4)
            .attr('fill', '#FFFFFF') // White background
            .attr('opacity', 0.85)
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('stroke', '#e5e5e5')
            .attr('stroke-width', 0.5);
        });

      const nodeGroup = svg.append('g')
        .selectAll('g')
        .data(filteredNodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x0},${d.y0})`)
        .on('click', (event, d) => highlightConnections(d))
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('opacity', 0.8);

          const weight = Math.round(d.value).toLocaleString();
          const percentage = Math.round((d.value / d3.sum(sankeyData.nodes, n => n.value || 0)) * 100);

          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: `${d.name}: ${weight} lbs (${percentage}%)`
          });
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style('opacity', 1);

          setTooltip({ ...tooltip, visible: false });
        });

      nodeGroup.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => nodeColorScale(d))
        .attr('rx', 3)
        .attr('ry', 3);

      const addLabelWithBackground = (text) => {
        const bbox = text.node().getBBox();
        const padding = 3;

        text.parent()
          .insert('rect', 'text')
          .attr('x', bbox.x - padding)
          .attr('y', bbox.y - padding)
          .attr('width', bbox.width + (padding * 2))
          .attr('height', bbox.height + (padding * 2))
          .attr('fill', '#FFFFFF') // White background
          .attr('opacity', 0.85)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('stroke', '#e5e5e5')
          .attr('stroke-width', 0.5);

        return text.attr('fill', '#000000'); // Black text
      };

      const LABEL_COLOR = '#000000'; // Consistent black text

      nodeGroup.each(function(d) {
        const nodeWidth = d.x1 - d.x0;
        const nodeHeight = d.y1 - d.y0;

        if (nodeHeight < 15 || nodeWidth < 25) return;

        let labelText = d.displayName || d.name;
        if (nodeWidth < 60) {
          if (labelText.includes('&')) labelText = labelText.split('&')[0].trim();
          else if (labelText.includes(' ')) labelText = labelText.split(' ')[0];
        }

        const text = d3.select(this).append('text')
          .attr('class', 'node-label')
          .attr('x', nodeWidth / 2)
          .attr('y', nodeHeight / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(labelText);

        addLabelWithBackground(text);
      });

      filteredNodes.filter(d => d.type === 'material').forEach(node => {
        const y = node.y0 + (node.y1 - node.y0) / 2;

        svg.append('line')
          .attr('class', 'connector')
          .attr('x1', -5)
          .attr('y1', y)
          .attr('x2', node.x0)
          .attr('y2', y)
          .attr('stroke', LABEL_COLOR)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-dasharray', '3,3');

        const label = svg.append('text')
          .attr('class', 'material-label')
          .attr('x', -10)
          .attr('y', y)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'end')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .attr('fill', LABEL_COLOR)
          .text(node.name);

        addLabelWithBackground(label);
      });

      filteredNodes.filter(d => d.type === 'destination').forEach(node => {
        const y = node.y0 + (node.y1 - node.y0) / 2;

        svg.append('line')
          .attr('class', 'connector')
          .attr('x1', node.x1)
          .attr('y1', y)
          .attr('x2', width + 5)
          .attr('y2', y)
          .attr('stroke', LABEL_COLOR)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-dasharray', '3,3');

        const label = svg.append('text')
          .attr('class', 'destination-label')
          .attr('x', width + 10)
          .attr('y', y)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'start')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .attr('fill', LABEL_COLOR)
          .text(node.name);

        addLabelWithBackground(label);
      });

      const title = svg.append('text')
        .attr('x', width / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .attr('fill', LABEL_COLOR)
        .text('Material Flow Analysis');

      addLabelWithBackground(title);

      const totalWeight = d3.sum(links, d => d.value);
      const subtitle = svg.append('text')
        .attr('x', width / 2)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .attr('fill', LABEL_COLOR)
        .text(`Total: ${Math.round(totalWeight/1000).toLocaleString()}k lbs (${year})`);

      addLabelWithBackground(subtitle);

      const legendItems = [
        { label: 'Landfill', color: categoryBaseColors['Landfill'] },
        { label: 'Recycling', color: categoryBaseColors['Recycling'] },
        { label: 'Compost', color: categoryBaseColors['Compost'] },
        { label: 'Reuse', color: categoryBaseColors['Reuse'] }
      ];

      const legendWidth = legendItems.length * 80;
      const legendGroup = svg.append('g')
        .attr('transform', `translate(${width/2 - legendWidth/2}, ${height + 20})`);

      legendItems.forEach((item, i) => {
        const g = legendGroup.append('g')
          .attr('transform', `translate(${i * 80}, 0)`);

        g.append('rect')
          .attr('width', 16)
          .attr('height', 16)
          .attr('fill', item.color)
          .attr('rx', 3)
          .attr('ry', 3);

        const legendLabel = g.append('text')
          .attr('x', 24)
          .attr('y', 13)
          .attr('fill', LABEL_COLOR)
          .text(item.label)
          .style('font-size', '12px')
          .style('font-weight', 'bold');

        addLabelWithBackground(legendLabel);
      });

      const instructionsText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-style', 'italic')
        .attr('fill', '#666')
        .text('Click on any material or destination to highlight its connections');
    } catch (error) {
      console.error('Error rendering network visualization:', error);
    }
  }, [data, year, activeNode, selectedCategory, getColorScheme]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '550px' }}>
      <svg ref={svgRef} width="100%" height="550" />
      
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
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </Box>
  );
};

export default WasteFlowNetwork;