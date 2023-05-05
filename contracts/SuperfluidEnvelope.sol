// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ISuperToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import { ISuperfluid } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import { SuperTokenV1Library } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import { ISuperApp } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperApp.sol";

error NotEnoughDeposit();
error AlreadyMinted();
error OnePerHolder();
error ReceiverIsSuperApp();

contract SuperfluidEnvelope is Ownable, ERC721 {

    using SuperTokenV1Library for ISuperToken;

    ISuperToken public rewardToken;

    uint256 public streamDuration;

    int96 public flowRate;

    string public metadata;

    uint256 public mintTimestamp;

    uint256 public tokenIdCounter;

    bool public ended;

    constructor(
        ISuperToken _rewardToken,
        uint256 _streamDuration,
        int96 _flowRate,
        string memory _metadata,
        address _owner
    ) ERC721 (
        "Superfluid Streaming Contest - ETHToyko 2023",
        "SFE23"
    ) {
        
        rewardToken = _rewardToken;
        streamDuration = _streamDuration;
        flowRate = _flowRate;        
        metadata = _metadata;

        transferOwnership(_owner);

    }

    /// @notice Return whether the contract has sufficient rewardToken
    function enoughDeposit(uint256 numRecipients) public view returns (bool) {

        return (
            rewardToken.balanceOf(address(this)) >=
            uint(int(flowRate)) * streamDuration * numRecipients
        );

        
    }

    /// @notice mint NFTs to recipients and start streams to them
    function mint(address[] memory streamRecipients) external onlyOwner {
        
        if ( !enoughDeposit(streamRecipients.length) ) revert NotEnoughDeposit();
        if ( mintTimestamp != 0 ) revert AlreadyMinted();

        for (uint i = 0; i < streamRecipients.length; i++) {

            tokenIdCounter += 1;

            _mint(streamRecipients[i], tokenIdCounter);

            rewardToken.createFlow(streamRecipients[i], flowRate);

        }

        mintTimestamp = block.timestamp;

    }

    /// @notice end streams to recipients
    function end() external onlyOwner {

        for (uint i = 1; i < 1+tokenIdCounter; i++) {   

            address envelopeOwner = ownerOf(i);

            if ( rewardToken.getFlowRate(address(this), envelopeOwner) != 0 ) {         

                rewardToken.deleteFlow(address(this), envelopeOwner);
            
            }

        }

        if ( block.timestamp < (mintTimestamp + streamDuration) ) {

            for ( uint i = 1; i < 1+tokenIdCounter; i++ ) {

                rewardToken.transfer(
                    ownerOf(i), 
                    ( ( mintTimestamp + streamDuration ) - block.timestamp ) * uint(int(flowRate)) 
                );

            }

        }

        ended = true;

    }

    /// @notice emergency withdrawal of rewardTokens
    function withdraw(uint256 amount) external onlyOwner {

        rewardToken.transfer(msg.sender, amount);

    } 

    /// @notice Send rewardToken stream to new holder instead
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 /*tokenId*/,
        uint256 /*batchSize*/
    ) internal override {

        if ( balanceOf(to) > 0 ) revert OnePerHolder();
        if ( ISuperfluid(rewardToken.getHost()).isApp(ISuperApp(to)) ) revert ReceiverIsSuperApp();

        if (from != address(0) && !ended) {

            rewardToken.deleteFlow(address(this), from);

            rewardToken.createFlow(to, flowRate);

        }

    }

    /// @notice All NFTs have same metadata
    function tokenURI(uint256)
        public
        view
        override(ERC721)
        returns (string memory)
    {

        return metadata;

    }

}