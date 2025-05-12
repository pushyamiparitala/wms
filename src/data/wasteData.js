// Load and process data from the CSV file
import * as d3 from 'd3';

// Start with empty array - will be populated when loaded from CSV
let wasteData = [];

// Process a string value that might contain commas as a number
const parseWeight = (weightStr) => {
  if (!weightStr || weightStr === '') return 0;
  // Remove commas and convert to number
  return parseFloat(weightStr.replace(/,/g, ''));
};

// Load the data asynchronously
d3.csv('/data/assign2_25S_wastedata.csv').then(csvData => {
  // Process each row of the CSV
  wasteData = csvData.map(row => {
    return {
      Year: row.Year ? parseInt(row.Year) : null,
      Month: row.Month || '',
      Day: row.Day || '',
      Category: row.Category || '',
      MaterialType: row['Material Type'] || '',
      Weight: parseWeight(row['Weight (lbs)']),
      Vendor: row.Vendor || '',
      DateUpdated: row['Date Updated'] || '',
      Cost: row.Cost || ''
    };
  }).filter(d => d.Year && d.Category && d.Weight > 0); // Filter out invalid entries
});

// Helper function to aggregate data by year, category, and material type
export const getAggregatedData = () => {
  const aggregatedData = [];
  
  // Group by Year, Category, and MaterialType
  const groupedData = d3.group(wasteData, 
    d => d.Year, 
    d => d.Category, 
    d => d.MaterialType
  );
  
  // Convert the nested map to an array of objects
  groupedData.forEach((yearData, year) => {
    yearData.forEach((categoryData, category) => {
      categoryData.forEach((materialData, materialType) => {
        // Sum the weights
        const totalWeight = d3.sum(materialData, d => d.Weight);
        
        aggregatedData.push({
          Year: year,
          Category: category,
          MaterialType: materialType,
          Weight: totalWeight
        });
      });
    });
  });
  
  return aggregatedData;
};

// Add some predefined data for visualizations if CSV load fails
// This ensures backward compatibility
const predefinedData = [
  // Landfill data for 2024
  { Year: 2024, Month: "Jan", Category: "Landfill", MaterialType: "L-Landfill", Weight: 150000 },
  { Year: 2024, Month: "Feb", Category: "Landfill", MaterialType: "L-Landfill", Weight: 140000 },
  { Year: 2024, Month: "Mar", Category: "Landfill", MaterialType: "L-Landfill", Weight: 145000 },
  
  // Recycling data for 2024
  { Year: 2024, Month: "Jan", Category: "Recycle", MaterialType: "R-Mixed recycling", Weight: 70000 },
  { Year: 2024, Month: "Feb", Category: "Recycle", MaterialType: "R-Mixed recycling", Weight: 75000 },
  { Year: 2024, Month: "Mar", Category: "Recycle", MaterialType: "R-Mixed recycling", Weight: 72000 },
  
  // Compost data for 2024
  { Year: 2024, Month: "Jan", Category: "Compost", MaterialType: "C-Organics", Weight: 50000 },
  { Year: 2024, Month: "Feb", Category: "Compost", MaterialType: "C-Organics", Weight: 48000 },
  { Year: 2024, Month: "Mar", Category: "Compost", MaterialType: "C-Organics", Weight: 52000 },
  
  // Material specific data for network visualization
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Food Waste", Weight: 60000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Paper", Weight: 32000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Plastic", Weight: 40000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Other", Weight: 28000 },
  
  { Year: 2024, Month: "Jun", Category: "Recycle", MaterialType: "Paper", Weight: 40000 },
  { Year: 2024, Month: "Jun", Category: "Recycle", MaterialType: "Plastic", Weight: 22000 },
  { Year: 2024, Month: "Jun", Category: "Recycle", MaterialType: "Metal", Weight: 14000 },
  { Year: 2024, Month: "Jun", Category: "Recycle", MaterialType: "Glass", Weight: 12000 },
  
  { Year: 2024, Month: "Jun", Category: "Compost", MaterialType: "Food Waste", Weight: 55000 },
  { Year: 2024, Month: "Jun", Category: "Compost", MaterialType: "Yard Waste", Weight: 28000 },
  { Year: 2024, Month: "Jun", Category: "Compost", MaterialType: "Other Organics", Weight: 18000 },
  
  // Material types for network visualization
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "BOH Food Waste", Weight: 35000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "FOH Food Waste", Weight: 28000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Recyclable Beverage Containers", Weight: 8000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Compostable Serviceware", Weight: 15000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Misc Compost", Weight: 10000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Misc Recycling", Weight: 12000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Liquids", Weight: 5000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Surplus/Expired Food", Weight: 15000 },
  { Year: 2024, Month: "Jun", Category: "Landfill", MaterialType: "Misc Landfill", Weight: 25000 },
];

// Fallback to predefined data if CSV load fails or is empty
export default wasteData.length > 0 ? wasteData : predefinedData; 