// Libraries used
const http = require("http");
const app = require("./app");
const server = http.createServer(app);

// Set port
const port = process.env.API_PORT;

// Start website
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
