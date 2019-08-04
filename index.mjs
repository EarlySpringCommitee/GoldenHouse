import api from "./src/api.mjs";

api.start().then(port => {
    console.log("====== Golden House 已啟動 ======");
    console.log(`====== Port: ${port}`);
});
