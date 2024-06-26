const http = require("node:http");

const fs = require("fs");

// pdf
const PDFDocument = require("pdfkit");
const doc = new PDFDocument();

const trades = JSON.parse(fs.readFileSync("./data.json", "utf-8")).data;
const initCapital = 8000;

let totalPnlnFee = 0;
let totalProfit = 0;
let totalLosses = 0;
let numWins = 0;
let numLosses = 0;
let numTrades = 0;
let maxDrawdown = 0;
let currentAssets = initCapital;
let highestAssets = initCapital;
let totalReturns = 0;
let totalVariance = 0;
let averageReturn = 0;

for (const trade of trades) {
  // Only Close
  if (trade.fillPnl !== "0") {
    numTrades++;

    // each trade total Profits and losses + fee
    const totalPnl = parseFloat(trade.fillPnl) + parseFloat(trade.fee);

    // Sharpe
    // Assume Risk-Free is 3%
    const tradeReturn = totalPnl / initCapital;
    totalReturns += tradeReturn;

    averageReturn = totalReturns / numTrades;
    totalVariance += Math.pow(tradeReturn - averageReturn, 2);

    // Win and loss numbers
    if (totalPnl > 0) {
      numWins++;
      totalProfit += totalPnl;
    } else {
      numLosses++;
      totalLosses += totalPnl;
    }

    // MDD
    // (Trough Value — Peak Value) / Peak Value
    // https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp
    currentAssets += totalPnl;
    highestAssets = Math.max(currentAssets, highestAssets);
    maxDrawdown = Math.max(
      maxDrawdown,
      (highestAssets - currentAssets) / highestAssets
    );
  }
}
totalPnlnFee = totalProfit + totalLosses;

// (Total profit and loss + Total fee) / Initial capital
// https://mailchimp.com/marketing-glossary/roi/
const roi = (totalPnlnFee / initCapital) * 100;
// Win number / Trade number
// https://academy.binance.com/en/glossary/win-rate
const winRate = (numWins / numTrades) * 100;
// Win number / Loss number
// https://academy.binance.com/en/glossary/win-rate
const oddsRatio = numWins / numLosses;
// Total Gross Profit / Total Gross Loss
// https://www.investopedia.com/articles/fundamental-analysis/10/strategy-performance-reports.asp
const profitFactor = Math.abs(totalProfit / totalLosses);
// (Rx – Rf) / StdDev Rx
// (Expected portfolio return - Risk-free rate of return) / Standard deviation of portfolio return (or, volatility)
// Less than 1: Bad
// 1 – 1.99: Adequate/good
// 2 – 2.99: Very good
// Greater than 3: Excellent
// https://www.investopedia.com/articles/07/sharpe_ratio.asp
const standardDeviation = Math.sqrt(totalVariance / numTrades);
const sharpeRatio = averageReturn / standardDeviation;

const hostname = "127.0.0.1";
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello, World!\n");
});

server.listen(port, hostname, () => {
  doc.fontSize(24);
  doc.text("Trade History Report", {
    width: 410,
    align: "center",
  });

  doc.fontSize(16);
  doc.moveDown();
  doc.text("States", {
    width: 410,
    align: "left",
  });

  doc.fontSize(12);
  doc.moveDown();
  doc.text(`ROI : ${roi.toFixed(6)}%`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.text(`Win Rate : ${winRate.toFixed(2)}%`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.text(`MDD : ${maxDrawdown.toFixed(6)}%`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.text(`Odds Ratio : ${oddsRatio.toFixed(6)}`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.text(`Profit Factor : ${profitFactor.toFixed(6)}`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.text(`Sharpe Ratio : ${sharpeRatio.toFixed(6)}`, {
    width: 410,
    align: "left",
  });

  doc.moveDown();
  doc.moveDown();
  doc.moveDown();
  doc.fontSize(16);
  doc.moveDown();
  doc.text("Reference Information", {
    width: 410,
    align: "left",
  });

  doc.fontSize(12);
  doc.moveDown();
  doc.list(
    [
      "ROI : https://mailchimp.com/marketing-glossary/roi",
      "Win Rate and Odds Ratio: https://academy.binance.com/en/glossary/win-rate",
      "MDD : https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp",
      "Profit Factor : https://www.investopedia.com/articles/fundamental-analysis/10/strategy-performance-reports.asp",
      "Sharpe Ratio : https://www.investopedia.com/articles/07/sharpe_ratio.asp",
    ],
    {
      width: 500,
      align: "left",
      listType: "bullet",
      bulletRadius: 2,
      link: true,
    }
  );

  try {
    const d = new Date();
    const writeStream = fs.createWriteStream(
      `./${d.toLocaleTimeString()}_${d.getMonth()}_${d.getDate()}_report.pdf`
    );
    doc.pipe(writeStream); // write to PDF

    writeStream.on("finish", () => {
      server.close();
    });
    doc.end();
  } catch (error) {
    console.log(error);
  }
});
