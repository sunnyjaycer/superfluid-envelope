const hre = require("hardhat");

const SECONDS_IN_MONTH = 2592000;
const HUNDRED_PER_MONTH = 38580246913580;

const polygonUsdcxAddress = '0xCAa7349CEA390F89641fe306D93591f87595dc1F';
const recipients = [
  "0x63b1efc5602c0023bbb373f2350cf34c2e5f8669",
  "0x7fd17ada30306df0ac390fb2f4f96032297750cc",
  "0xc3d1d7e62473589ea934b128ff425a7b932b95d1",
  "0x74b4b8c7cb9a594a6440965f982def10bb9570b9",
  "0xee860e9d8ecbffea3d27eb76e5b923c2e9488acf"
]

const metadata = "ipfs://QmddAXVmZ2d5n6o6LXCVRtYG5gV3bjmUN1e6Te7MPZxydG"

const owner = "0x8A396863cD7726B18ebE34651D32B256d6c6De80"

module.exports = [
  polygonUsdcxAddress,
    SECONDS_IN_MONTH,
    HUNDRED_PER_MONTH,  // 100 USDCx over month
    metadata,
    owner
];

// npx hardhat verify --network polygon --constructor-args arguments.js 0x5de6334822FAe1Be99E69DAB9c502067dae02272
// https://goerli.etherscan.io/address/0x9D0A175C86236dAa19cbF41609B7ebad6eC003C8#code (non-transferrable)
// https://goerli.etherscan.io/address/0xE816DcBf51a3F87fbB079a4FBf54837add55E517#code (transferrable)