const fs = require("fs");

function copyDocsToWeb() {
  if (fs.existsSync("../web/docs")) {
    fs.rmSync("../web/docs", { recursive: true, force: true });
  }
  fs.mkdirSync("../web/docs");

  fs.cpSync("../docs", "../web/docs", { recursive: true });
}

copyDocsToWeb();
