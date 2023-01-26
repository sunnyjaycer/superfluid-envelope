// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ISuperToken } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import { ISuperfluid } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import { SuperTokenV1Library } from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import { ISuperApp } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperApp.sol";

error NonTransferable();
error NotEnoughDeposit();
error AlreadyMinted();
error OnePerHolder();
error ReceiverIsSuperApp();

contract SuperfluidEnvelope is Ownable, ERC721 {

    using SuperTokenV1Library for ISuperToken;

    uint256 public streamDuration;

    int96 public flowRate;

    ISuperToken public rewardToken;

    // address[] public streamRecipients;
    mapping( uint256 => address ) public streamRecipients;

    string public metadata;

    uint256 public mintTimestamp;

    uint256 public tokenIdCounter;

    uint256 public constant NUM_RECIPIENTS = 5;

    constructor(
        uint256 _streamDuration,
        int96 _flowRate,
        ISuperToken _rewardToken,
        address[] memory _streamRecipients,
        string memory _metadata,
        address _owner
    ) ERC721 (
        "Superfluid Lucky Red Envelope - 2023",
        "LRE23"
    ) {

        streamDuration = _streamDuration;
        flowRate = _flowRate;        
        rewardToken = _rewardToken;
        metadata = _metadata;
        
        streamRecipients[1] = _streamRecipients[0];
        streamRecipients[2] = _streamRecipients[1];
        streamRecipients[3] = _streamRecipients[2];
        streamRecipients[4] = _streamRecipients[3];
        streamRecipients[5] = _streamRecipients[4];

        transferOwnership(_owner);

    }

    /// @notice Return whether the contract has sufficient rewardToken
    function enoughDeposit() public view returns (bool) {

        return (
            rewardToken.balanceOf(address(this)) >=
            uint(int(flowRate)) * streamDuration * 5
        );

        
    }

    /// @notice mint NFTs to recipients and start streams to them
    function mint() external onlyOwner {
        
        if ( !enoughDeposit() ) revert NotEnoughDeposit();
        if ( mintTimestamp != 0 ) revert AlreadyMinted();

        for (uint i = 1; i < 1+NUM_RECIPIENTS; i++) {

            tokenIdCounter += 1;

            _mint(streamRecipients[i], tokenIdCounter);

            rewardToken.createFlow(streamRecipients[i], flowRate);

        }

        mintTimestamp = block.timestamp;

    }

    /// @notice end streams to recipients
    function end() external onlyOwner {

        for (uint i = 1; i < 1+NUM_RECIPIENTS; i++) {   

            if ( rewardToken.getFlowRate(address(this), streamRecipients[i]) != 0 ) {         

                rewardToken.deleteFlow(address(this), streamRecipients[i]);
            
            }

        }

        if ( block.timestamp < (mintTimestamp + streamDuration) ) {

            for ( uint i = 1; i < 1+NUM_RECIPIENTS; i++ ) {

                rewardToken.transfer(streamRecipients[i], ( ( mintTimestamp + streamDuration ) - block.timestamp ) * uint(int(flowRate)) );

            }

        }

    }

    /// @notice emergency withdrawal of rewardTokens
    function withdraw(uint256 amount) external onlyOwner {

        rewardToken.transfer(msg.sender, amount);

    } 

    /// @notice Send rewardToken stream to new holder instead
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 //open zeppelin's batchSize param
    ) internal override {

        if (balanceOf(to) > 0) revert OnePerHolder();
        if ( ISuperfluid(rewardToken.getHost()).isApp(ISuperApp(to)) ) revert ReceiverIsSuperApp();

        if (from != address(0) && rewardToken.getNetFlowRate(address(this)) != 0) {

            rewardToken.deleteFlow(address(this), from);

            rewardToken.createFlow(to, flowRate);

        }

        streamRecipients[tokenId] = to;

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
