const env = require("hardhat");
const hre = require("hardhat");
const superTokenABI = require("../artifacts/@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol/ISuperToken.json");
const envelopeABI = require("../artifacts/contracts/SuperfluidEnvelope.sol/SuperfluidEnvelope.json");

const usdcxAddress = "0x8aE68021f6170E5a766bE613cEA0d75236ECCa9a"
const envelopeAddress = "0x9D0A175C86236dAa19cbF41609B7ebad6eC003C8"

async function main() {

    let owner = await hre.ethers.getSigner();

    const envelope = await hre.ethers.getContractAt(envelopeABI.abi, envelopeAddress)
    
    const usdcx = await hre.ethers.getContractAt(superTokenABI.abi, usdcxAddress);
    console.log(`Initial Envelope USDCx Balance: ${await usdcx.balanceOf(envelope.address)}. You need 500e18 to mint!`);

    // call the mint
    // let mintTx = await envelope.connect(owner).mint();
    // await mintTx.wait();

    // call the end
    let endTx = await envelope.connect(owner).end();
    await endTx.wait();

    console.log(`Success!`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});