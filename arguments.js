const hre = require("hardhat");

const SECONDS_IN_YEAR = 60*60*24*365;    // Accounting for potential discrepency with 10 wei margin
const HUNDRED_PER_MONTH = Math.round(ethers.utils.parseUnits("100") / SECONDS_IN_YEAR).toString();

const goerliUsdcxAddress = '0x8aE68021f6170E5a766bE613cEA0d75236ECCa9a';
const recipients = [
  '0x688390820B57cd65c1f76B5509Ba28F79A343343',
  '0x7BDa037dFdf9CD9Ad261D27f489924aebbcE71Ac',
  '0xd964aB7E202Bab8Fbaa28d5cA2B2269A5497Cf68',
  '0xf8a025B42B07db05638FE596cce339707ec3cC71',
  '0x26715b05758fC09964733dd4B6a87e084d8Ce69e'
];

const metadata = "ipfs://Qmd8b5Gp8FGuvyu5nqZZwUEkKBjdPg6w7qD4oonMqod29f"

module.exports = [
    SECONDS_IN_YEAR,
    HUNDRED_PER_MONTH,  // 100 USDCx over month
    goerliUsdcxAddress,
    recipients,
    metadata
];

// npx hardhat verify --network goerli --constructor-args arguments.js [contractaddress]
// https://goerli.etherscan.io/address/0x9D0A175C86236dAa19cbF41609B7ebad6eC003C8#code