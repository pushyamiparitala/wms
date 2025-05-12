import React, { useState, useEffect } from 'react';
import { Container, Grid, Typography, Paper } from '@mui/material';
import TimeSeriesChart from './components/TimeSeriesChart';
import ZoomableTreemap from './components/ZoomableTreemap';
import ForceDirectedGraph from './components/ForceDirectedGraph';
import { loadWasteData, prepareTimeSeriesData, prepareNetworkData, prepareDistributionData } from './utils/dataLoader';

function App() {
  const [data, setData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load waste data from CSV
        const wasteData = await loadWasteData();
        
        if (!wasteData || wasteData.length === 0) {
          throw new Error('No data loaded from CSV');
        }
        
        // Set the data
        setData(wasteData);
        
        // Get the most recent year from the data
        const years = [...new Set(wasteData.map(d => d.Year))];
        const mostRecentYear = Math.max(...years);
        setSelectedYear(mostRecentYear);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading data...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Campus Waste Management Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* First Chart: Waste Generation Patterns Over Time */}
        <Grid item xs={12}>
          <Paper 
            elevation={3}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 240 }}
          >
            <Typography variant="h6" gutterBottom>
              Waste Generation Patterns Over Time
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Insight: This time series analysis tracks waste volume trends across different categories, 
              revealing seasonal patterns and long-term changes in campus waste generation.
            </Typography>
            <TimeSeriesChart data={data} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
          </Paper>
        </Grid>
        
        {/* Second Chart: Material Distribution Treemap */}
        <Grid item xs={12}>
          <Paper 
            elevation={3}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 240 }}
          >
            <Typography variant="h6" gutterBottom>
              Material Type Hierarchical View
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Insight: This interactive zoomable treemap reveals the hierarchical structure of waste materials. 
              Click on rectangles to zoom in on categories and explore detailed breakdowns of waste composition
              to identify areas for improvement in waste management practices.
            </Typography>
            <ZoomableTreemap />
          </Paper>
        </Grid>
        
        {/* Third Chart: Waste Misclassification Network */}
        <Grid item xs={12}>
          <Paper 
            elevation={3}
            sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 240 }}
          >
            <Typography variant="h6" gutterBottom>
              Waste Misclassification Network
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Insight: This network diagram highlights connections between waste categories, revealing how waste is 
              often misclassified. The thickness of connections indicates volume, with thicker lines 
              representing larger amounts of misclassified materials.
            </Typography>
            <ForceDirectedGraph 
              data={(year) => prepareDistributionData(data, year)}
              year={selectedYear}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App; 