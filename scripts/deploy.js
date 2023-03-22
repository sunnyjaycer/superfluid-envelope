// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const SECONDS_IN_MONTH = 60*60*24*30;    // Accounting for potential discrepency with 10 wei margin
const HUNDRED_PER_MONTH = Math.round(ethers.utils.parseUnits("100") / SECONDS_IN_MONTH).toString();

const goerliUsdcxAddress = '0x8aE68021f6170E5a766bE613cEA0d75236ECCa9a';
const recipients = [
  '0x688390820B57cd65c1f76B5509Ba28F79A343343',
  '0x7BDa037dFdf9CD9Ad261D27f489924aebbcE71Ac',
  '0xd964aB7E202Bab8Fbaa28d5cA2B2269A5497Cf68',
  '0xf8a025B42B07db05638FE596cce339707ec3cC71',
  '0x26715b05758fC09964733dd4B6a87e084d8Ce69e'
];

const metadata = "ipfs://QmR64PYq73mnHmuKkcTeLWqnSv2HU5Ce7f3cpM7igrpvLE"

const owner = "0xc41876DAB61De145093b6aA87417326B24Ae4ECD" // should be sunnyjaycer.eth for Polygon mainnet

async function main() {

  // const owner = ethers.getSigner();

  const Envelope = await hre.ethers.getContractFactory("SuperfluidEnvelope");
  const envelope = await Envelope.deploy(
    goerliUsdcxAddress,
    SECONDS_IN_MONTH,
    HUNDRED_PER_MONTH,  // 100 USDCx over month
    metadata,
    owner
  );

  await envelope.deployed();

  console.log(
    `Envelope deployed to ${envelope.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});