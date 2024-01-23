const { runListener } = require("./src/listener");
const { runSwapJob } = require("./src/swap");

runListener();
runSwapJob();
setInterval(runSwapJob, 10 * 1000);