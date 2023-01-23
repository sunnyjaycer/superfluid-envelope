// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ISuperToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import { SuperTokenV1Library } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

error NonTransferable();
error NotEnoughDeposit();
error AlreadyMinted();

contract SuperfluidEnvelope is Ownable, ERC721 {

    using SuperTokenV1Library for ISuperToken;

    uint256 public streamDuration;

    int96 public flowRate;

    ISuperToken public rewardToken;

    address[] public streamRecipients;

    string public metadata;

    uint256 public mintTimestamp;

    uint256 public tokenIdCounter;

    constructor(
        uint256 _streamDuration,
        int96 _flowRate,
        ISuperToken _rewardToken,
        address[] memory _streamRecipients,
        string memory _metadata
    ) ERC721 (
        "Superfluid Lucky Red Envelope - 2023",
        "LRE23"
    ) {

        streamDuration = _streamDuration;
        flowRate = _flowRate;
        streamRecipients = _streamRecipients;
        rewardToken = _rewardToken;
        metadata = _metadata;

        transferOwnership(msg.sender);

    }

    function enoughDeposit() public view returns (bool) {

        // get how many tokens are needed to stream to the receivers as flowRate * streamDuration * receivers.length
        // return if there are that many tokens in the contract

        // console.log("expected balance:");
        // console.log( uint(int(flowRate)) * streamDuration * streamRecipients.length );
        // console.log("reward token balance of envelope:");
        // console.log( IERC20(rewardToken).balanceOf(address(this)) );

        return (
            rewardToken.balanceOf(address(this)) >=
            uint(int(flowRate)) * streamDuration * streamRecipients.length
        );

        
    }

    function mint() external onlyOwner {
        
        if ( !enoughDeposit() ) revert NotEnoughDeposit();
        if ( mintTimestamp != 0 ) revert AlreadyMinted();

        for (uint i = 0; i < streamRecipients.length; i++) {
            tokenIdCounter += 1;

            // console.log("minted", tokenIdCounter);

            _mint(streamRecipients[i], tokenIdCounter);

            rewardToken.createFlow(streamRecipients[i], flowRate);

            // console.log("streaming to", streamRecipients[i]);
        }

        mintTimestamp = block.timestamp;

    }

    function end() external onlyOwner {


        for (uint i = 0; i < streamRecipients.length; i++) {   

            if ( rewardToken.getFlowRate(address(this), streamRecipients[i]) != 0 ) {         

                rewardToken.deleteFlow(address(this), streamRecipients[i]);
            
            }

        }

        uint256 remainingStreamTime = ( mintTimestamp + streamDuration ) - block.timestamp;

        // separating out so that contract recovers buffer amounts and then executes remaining transfers
        for (uint i = 0; i < streamRecipients.length; i++) {   

            // if we haven't yet passed the end date, then we need to transfer what's left
            // if a recipient cancels their own stream, they're out of luck. We only transfer
            // the remaining until end of duration
            if ( block.timestamp < mintTimestamp + streamDuration ) {

                rewardToken.transfer(streamRecipients[i], remainingStreamTime * uint(int(flowRate)) );

                // console.log("transferring in", remainingStreamTime * uint(int(flowRate)));

            }

        }

    }

    function withdraw(uint256 amount) external onlyOwner {

        rewardToken.transfer(msg.sender, amount);

    } 



    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {

        revert NonTransferable();

    }

    function tokenURI(uint256)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        return metadata;
    }

}
