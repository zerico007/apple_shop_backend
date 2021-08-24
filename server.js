const http = require("http");
const app = require("./app");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

server.on("listening", () => console.log(`listening on port ${port}`));

server.listen(port);
