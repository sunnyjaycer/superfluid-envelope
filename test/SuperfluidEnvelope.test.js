const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { Framework } = require("@superfluid-finance/sdk-core")
const { deployTestFramework } = require("@superfluid-finance/ethereum-contracts/dev-scripts/deploy-test-framework");
const TestToken = require("@superfluid-finance/ethereum-contracts/build/contracts/TestToken.json");

let sfDeployer
let contractsFramework
let sf
let envelope
let envelopeFactory
let usdc
let usdcx
let checkPoint = 0;

// Test Accounts
let owner
let alice
let bob
let eric
let sunny
let joel

const thousandEther = ethers.utils.parseEther("10000")
const SECONDS_IN_YEAR = 60*60*24*365;    // Accounting for potential discrepency with 10 wei margin
const SECONDS_IN_DAY = 60*60*24;
const HUNDRED_PER_YEAR = Math.round(ethers.utils.parseUnits("100") / SECONDS_IN_YEAR).toString();

const expecationDiffLimit = 100000000;

before(async function () {

    console.log("Per second flow rate:", HUNDRED_PER_YEAR)

    // get hardhat accounts
    ;[deployer, owner, alice, bob, eric, sunny, joel] = await ethers.getSigners()

    sfDeployer = await deployTestFramework();

    // GETTING SUPERFLUID FRAMEWORK SET UP

    // deploy the framework locally
    contractsFramework = await sfDeployer.getFramework()

    // initialize framework
    sf = await Framework.create({
        chainId: 31337,
        provider: owner.provider,
        resolverAddress: contractsFramework.resolver, // (empty)
        protocolReleaseVersion: "test"
    })

    // DEPLOYING USDC and USDC wrapper super token
    tokenDeployment = await sfDeployer.deployWrapperSuperToken(
        "Fake USDC Token",
        "fUSDC",
        18,
        ethers.utils.parseEther("100000000").toString()
    )

    usdcx = await sf.loadSuperToken("fUSDCx")
    usdc = new ethers.Contract(
        usdcx.underlyingToken.address,
        TestToken.abi,
        owner
    )
    // minting test USDC
    await usdc.mint(owner.address, thousandEther)
    // await usdc.mint(alice.address, thousandEther)
    // await usdc.mint(bob.address, thousandEther)

    // approving USDCx to spend USDC (Super Token object is not an ethers contract object and has different operation syntax)
    await usdc.approve(usdcx.address, ethers.constants.MaxInt256)
    // await usdc
    //     .connect(alice)
    //     .approve(usdcx.address, ethers.constants.MaxInt256)
    // await usdc
    //     .connect(bob)
    //     .approve(usdcx.address, ethers.constants.MaxInt256)

    // Upgrading all USDC to USDCx
    const ownerUpgrade = usdcx.upgrade({ amount: thousandEther })
    // const aliceUpgrade = usdcx.upgrade({ amount: thousandEther })
    // const bobUpgrade = usdcx.upgrade({ amount: thousandEther })

    await ownerUpgrade.exec(owner)
    // await aliceUpgrade.exec(alice)
    // await bobUpgrade.exec(bob)

    envelopeFactory = await ethers.getContractFactory("SuperfluidEnvelope", owner)

    console.log("Host", sf.settings.config.hostAddress);
    console.log("CFA ", sf.settings.config.cfaV1Address);

})

describe("Envelope Contract", function () {

    beforeEach(async () => {

      envelope = await envelopeFactory.connect(deployer).deploy(
        SECONDS_IN_YEAR,
        HUNDRED_PER_YEAR,  // 100 USDCx over month
        usdcx.address,
        [alice.address, bob.address, eric.address, sunny.address, joel.address],  // recipients
        "ipfs://Qmd8b5Gp8FGuvyu5nqZZwUEkKBjdPg6w7qD4oonMqod29f",
        owner.address
      );
      await envelope.deployed()

      // transfer in 500 USDCx
      let transferOp = usdcx.transfer({
        receiver: envelope.address,
        amount: ethers.utils.parseUnits("500")
      });
      await transferOp.exec(owner);

      // Mint NFTs (also verify onlyOwner)
      await expect(
        envelope.connect(alice).mint()
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await envelope.connect(owner).mint();

      // Get timestamp of creation
    //   if (checkPoint == 0) {
    //       checkPoint = await time.latest();
    //   }
      checkPoint = await time.latest();


      // Verify that everyone has an NFT
      expect(
        await envelope.balanceOf(alice.address)
      ).to.eq(1);
      expect(
        await envelope.balanceOf(bob.address)
      ).to.eq(1);
      expect(
        await envelope.balanceOf(eric.address)
      ).to.eq(1);
      expect(
        await envelope.balanceOf(sunny.address)
      ).to.eq(1);
      expect(
        await envelope.balanceOf(joel.address)
      ).to.eq(1);

      // Verify proper token ids
      expect(
        await envelope.ownerOf(1)
      ).to.eq(alice.address);
      expect(
        await envelope.ownerOf(2)
      ).to.eq(bob.address);
      expect(
        await envelope.ownerOf(3)
      ).to.eq(eric.address);
      expect(
        await envelope.ownerOf(4)
      ).to.eq(sunny.address);
      expect(
        await envelope.ownerOf(5)
      ).to.eq(joel.address);

      // Verify that metadata is expected
      expect(
          await envelope.tokenURI(1)
      ).to.eq("ipfs://Qmd8b5Gp8FGuvyu5nqZZwUEkKBjdPg6w7qD4oonMqod29f");

      // Verify flow rates are as expected
      expect(
        (await usdcx.getFlow({
          sender: envelope.address,
          receiver: alice.address,
          providerOrSigner: owner
        })).flowRate
      ).to.eq(HUNDRED_PER_YEAR);
      expect(
        (await usdcx.getFlow({
          sender: envelope.address,
          receiver: bob.address,
          providerOrSigner: owner
        })).flowRate
      ).to.eq(HUNDRED_PER_YEAR);
      expect(
        (await usdcx.getFlow({
          sender: envelope.address,
          receiver: eric.address,
          providerOrSigner: owner
        })).flowRate
      ).to.eq(HUNDRED_PER_YEAR);
      expect(
        (await usdcx.getFlow({
          sender: envelope.address,
          receiver: sunny.address,
          providerOrSigner: owner
        })).flowRate
      ).to.eq(HUNDRED_PER_YEAR);
      expect(
        (await usdcx.getFlow({
          sender: envelope.address,
          receiver: joel.address,
          providerOrSigner: owner
        })).flowRate
      ).to.eq(HUNDRED_PER_YEAR);

    })

    afterEach(async () => {

        // transfer away all usdcx received
        // console.log("transferring out:", await usdcx.balanceOf({
        //     account: alice.address,
        //     providerOrSigner: owner
        // }));
        ( usdcx.transfer({
            receiver: owner.address,
            amount: await usdcx.balanceOf({
                account: alice.address,
                providerOrSigner: owner
            })
        }) ).exec(alice);
        ( usdcx.transfer({
            receiver: owner.address,
            amount: await usdcx.balanceOf({
                account: bob.address,
                providerOrSigner: owner
            })
        }) ).exec(bob);
        ( usdcx.transfer({
            receiver: owner.address,
            amount: await usdcx.balanceOf({
                account: eric.address,
                providerOrSigner: owner
            })
        }) ).exec(eric);
        ( usdcx.transfer({
            receiver: owner.address,
            amount: await usdcx.balanceOf({
                account: sunny.address,
                providerOrSigner: owner
            })
        }) ).exec(sunny);
        ( usdcx.transfer({
            receiver: owner.address,
            amount: await usdcx.balanceOf({
                account: joel.address,
                providerOrSigner: owner
            })
        }) ).exec(joel);
        
        // // close out streams
        // await envelope.connect(owner).end();

    });

    it("NFTs are non-transferrable", async function () {

        await expect(
            envelope.connect(alice).transferFrom(alice.address, bob.address, 1)
        ).to.be.revertedWithCustomError(envelope, "NonTransferable");

        // close out streams
        await envelope.connect(owner).end();

    });

    it("End streams 5 days before month duration", async function () {

        await time.increaseTo( checkPoint + SECONDS_IN_YEAR - (SECONDS_IN_DAY*5) );

        // end streams, also verify onlyOwner
        await expect(
            envelope.connect(alice).end()
        ).to.be.revertedWith('Ownable: caller is not the owner');
        await envelope.connect(owner).end();
        
        // expect all streams to be cancelled
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: alice.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: bob.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: eric.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: sunny.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: joel.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');

        // balance of contract is zeroed out
        expect(
            parseInt(await usdcx.balanceOf({
                account: envelope.address,
                providerOrSigner: owner
            }))
        ).to.closeTo(
            ethers.utils.parseUnits("500") - ( HUNDRED_PER_YEAR * SECONDS_IN_YEAR * 5 ),
            expecationDiffLimit
        );

        expect(
            parseInt(await usdcx.balanceOf({
                account: alice.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );

    });

    it("End streams 2 weeks before month duration", async function () {

        await time.increaseTo( checkPoint + ( SECONDS_IN_YEAR - (SECONDS_IN_DAY*14) ) );

        // end streams, also verify onlyOwner
        await expect(
            envelope.connect(alice).end()
        ).to.be.revertedWith('Ownable: caller is not the owner');
        await envelope.connect(owner).end();
        
        // expect all streams to be cancelled
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: alice.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: bob.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: eric.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: sunny.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: joel.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');

        // balance of contract is zeroed out
        expect(
            parseInt(await usdcx.balanceOf({
                account: envelope.address,
                providerOrSigner: owner
            }))
        ).to.closeTo(
            ethers.utils.parseUnits("500") - ( HUNDRED_PER_YEAR * SECONDS_IN_YEAR * 5 ),
            expecationDiffLimit
        );

        // recipient balances are full
        expect(
            parseInt(await usdcx.balanceOf({
                account: alice.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: bob.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: eric.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: sunny.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: joel.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );


    });

    it("Rogue cancellations", async function () {

        await time.increaseTo( checkPoint + ( SECONDS_IN_YEAR - (SECONDS_IN_DAY*14) ) );

        // delete flows
        let flowOp = usdcx.deleteFlow({
            sender: envelope.address,
            receiver: alice.address
        });
        await flowOp.exec(alice);

        flowOp = usdcx.deleteFlow({
            sender: envelope.address,
            receiver: bob.address
        });
        await flowOp.exec(bob);

        // attempt ending
        await envelope.connect(owner).end();

        // expect all streams to be cancelled
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: alice.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: bob.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: eric.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: sunny.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');
        expect(
            (await usdcx.getFlow({
                sender: envelope.address,
                receiver: joel.address,
                providerOrSigner: owner
            })).flowRate
        ).to.eq('0');

        // non-rogue recipient balances are full
        // recipient balances are full
        expect(
            parseInt(await usdcx.balanceOf({
                account: eric.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: sunny.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );
        expect(
            parseInt(await usdcx.balanceOf({
                account: joel.address,
                providerOrSigner: owner
            }))
        ).to.eq(
            HUNDRED_PER_YEAR * SECONDS_IN_YEAR
        );


    });

    it("Emergency withdrawal", async function () {

        // attempt withdrawal
        await expect(
            envelope.connect(alice).withdraw(1000)
        ).to.be.revertedWith('Ownable: caller is not the owner');
        envelope.connect(owner).withdraw(1000);

        // transfer in 10 additional USDCx
        let transferOp = usdcx.transfer({
            receiver: envelope.address,
            amount: ethers.utils.parseUnits("10")
        });
        await transferOp.exec(owner);    

        // delete flows (rogue)
        let flowOp = usdcx.deleteFlow({
            sender: envelope.address,
            receiver: alice.address
        });
        await flowOp.exec(alice);
        
        // end
        await envelope.connect(owner).end();

        // attempt withdrawal
        await envelope.connect(owner).withdraw(
            await usdcx.balanceOf({
                account: envelope.address,
                providerOrSigner: owner
            })
        );

        await expect(
            await usdcx.balanceOf({
                account: envelope.address,
                providerOrSigner: owner
            })
        ).to.eq('0');

    });

});