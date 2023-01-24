// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

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
        string memory _metadata,
        address _owner
    ) ERC721 (
        "Superfluid Lucky Red Envelope - 2023",
        "LRE23"
    ) {

        streamDuration = _streamDuration;
        flowRate = _flowRate;
        streamRecipients = _streamRecipients;
        rewardToken = _rewardToken;
        metadata = _metadata;

        transferOwnership(_owner);

    }

    /// @notice Return whether the contract has sufficient rewardToken
    function enoughDeposit() public view returns (bool) {

        return (
            rewardToken.balanceOf(address(this)) >=
            uint(int(flowRate)) * streamDuration * streamRecipients.length
        );

        
    }

    /// @notice mint NFTs to recipients and start streams to them
    function mint() external onlyOwner {
        
        if ( !enoughDeposit() ) revert NotEnoughDeposit();
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

        for (uint i = 0; i < streamRecipients.length; i++) {   

            if ( rewardToken.getFlowRate(address(this), streamRecipients[i]) != 0 ) {         

                rewardToken.deleteFlow(address(this), streamRecipients[i]);
            
            }

        }

        if ( block.timestamp < (mintTimestamp + streamDuration) ) {

            for ( uint i = 0; i < streamRecipients.length; i++ ) {

                rewardToken.transfer(streamRecipients[i], ( ( mintTimestamp + streamDuration ) - block.timestamp ) * uint(int(flowRate)) );

            }

        }

    }

    /// @notice emergency withdrawal of rewardTokens
    function withdraw(uint256 amount) external onlyOwner {

        rewardToken.transfer(msg.sender, amount);

    } 

    /// @notice NFTs are non-transferrable
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {

        revert NonTransferable();

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
