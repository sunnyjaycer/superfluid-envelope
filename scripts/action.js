const env = require("hardhat");
const hre = require("hardhat");
const superTokenABI = require("../artifacts/@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol/ISuperToken.json");
const envelopeABI = require("../artifacts/contracts/SuperfluidEnvelope.sol/SuperfluidEnvelope.json");

const usdcxAddress = "0x8aE68021f6170E5a766bE613cEA0d75236ECCa9a"
const envelopeAddress = "0x3C08936b549537025601686535C98702931EC1BA"
const recipients = [
    '0x688390820B57cd65c1f76B5509Ba28F79A343343',
    '0x7BDa037dFdf9CD9Ad261D27f489924aebbcE71Ac',
    '0xd964aB7E202Bab8Fbaa28d5cA2B2269A5497Cf68',
    '0xf8a025B42B07db05638FE596cce339707ec3cC71',
    '0x26715b05758fC09964733dd4B6a87e084d8Ce69e'
];

async function main() {

    let owner = await hre.ethers.getSigner();

    const envelope = await hre.ethers.getContractAt(envelopeABI.abi, envelopeAddress)
    
    const usdcx = await hre.ethers.getContractAt(superTokenABI.abi, usdcxAddress);
    console.log(`Initial Envelope USDCx Balance of ${envelope.address}: ${await usdcx.balanceOf(envelope.address)}. You need 500e18 to mint!`);

    // call the mint
    // let mintTx = await envelope.connect(owner).mint(
    //     recipients
    // );
    // await mintTx.wait();

    // // call the end
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