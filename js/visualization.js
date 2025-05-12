// Color scheme for different waste categories
const colors = {
    'Recycle': '#2ecc71',
    'Landfill': '#e74c3c',
    'Compost': '#8b4513'
};

// Chart dimensions and margins
const margin = { top: 20, right: 30, bottom: 40, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Initialize the visualization
async function initVisualization() {
    // Load and process the data
    const data = await d3.csv('assign2_25S_wastedata.csv');
    
    // Process the data
    const processedData = processData(data);
    
    // Create year selector
    createYearSelector(processedData);
    
    // Initialize charts
    createTrendChart(processedData);
    createCompositionChart(processedData);
    
    // Add event listeners
    addEventListeners(processedData);
}

// Process the raw data
function processData(data) {
    // Convert weight strings to numbers and remove commas
    data.forEach(d => {
        d.weight = +d['Weight (lbs)'].replace(/,/g, '');
        d.date = new Date(d.Year, getMonthNumber(d.Month));
    });

    // Group data by date and category
    const groupedData = d3.group(data, d => d.date, d => d.Category);
    
    // Convert to array format for visualization
    const processedData = [];
    groupedData.forEach((categories, date) => {
        const entry = { date };
        categories.forEach((values, category) => {
            entry[category] = d3.sum(values, d => d.weight);
        });
        processedData.push(entry);
    });

    return processedData.sort((a, b) => a.date - b.date);
}

// Create the trend chart
function createTrendChart(data) {
    const svg = d3.select('#trend-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.Recycle || 0, d.Landfill || 0, d.Compost || 0))])
        .range([height, 0]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    // Create line generators
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    // Draw lines for each category
    Object.keys(colors).forEach(category => {
        const categoryData = data.map(d => ({
            date: d.date,
            value: d[category] || 0
        }));

        svg.append('path')
            .datum(categoryData)
            .attr('fill', 'none')
            .attr('stroke', colors[category])
            .attr('stroke-width', 2)
            .attr('d', line);
    });

    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, 0)`);

    Object.entries(colors).forEach(([category, color], i) => {
        const legendItem = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendItem.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', color);

        legendItem.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(category);
    });
}

// Create the composition chart
function createCompositionChart(data) {
    const svg = d3.select('#composition-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => (d.Recycle || 0) + (d.Landfill || 0) + (d.Compost || 0))])
        .range([height, 0]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    // Create area generator
    const area = d3.area()
        .x(d => x(d.date))
        .y0(d => y(d.y0))
        .y1(d => y(d.y0 + d.value));

    // Stack the data
    const stack = d3.stack()
        .keys(['Recycle', 'Landfill', 'Compost'])
        .value((d, key) => d[key] || 0);

    const stackedData = stack(data);

    // Draw areas
    svg.selectAll('path')
        .data(stackedData)
        .enter()
        .append('path')
        .attr('fill', d => colors[d.key])
        .attr('d', area);
}

// Create year selector dropdown
function createYearSelector(data) {
    const years = [...new Set(data.map(d => d.date.getFullYear()))];
    const select = d3.select('#year');

    select.selectAll('option')
        .data(years)
        .enter()
        .append('option')
        .text(d => d);
}

// Add event listeners for interactivity
function addEventListeners(data) {
    // Year selector change
    d3.select('#year').on('change', function() {
        const selectedYear = +this.value;
        updateCharts(data, selectedYear);
    });

    // Category checkbox changes
    d3.selectAll('.checkbox-group input').on('change', function() {
        const selectedCategories = Array.from(d3.selectAll('.checkbox-group input:checked'))
            .map(input => input.value);
        updateCharts(data, +d3.select('#year').property('value'), selectedCategories);
    });
}

// Update charts based on selected year and categories
function updateCharts(data, selectedYear, selectedCategories) {
    const filteredData = data.filter(d => d.date.getFullYear() === selectedYear);
    // Update both charts with filtered data
    d3.select('#trend-chart').selectAll('*').remove();
    d3.select('#composition-chart').selectAll('*').remove();
    createTrendChart(filteredData);
    createCompositionChart(filteredData);
}

// Helper function to convert month names to numbers
function getMonthNumber(month) {
    const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[month];
}

// Initialize the visualization when the page loads
document.addEventListener('DOMContentLoaded', initVisualization); 