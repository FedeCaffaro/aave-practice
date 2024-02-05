import { Contract, Signer } from "ethers";
import { getWeth } from "./getWeth";
import { ethers } from "hardhat";
import { ChildProcess } from "child_process";
import { get } from "http";

async function main() {
  const [address1] = await ethers.getSigners();
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  // Getting WETH to deposit
  const wethBalance = await getWeth();

  // Getting the lending pool address
  const aaveLendingPoolContract = await getLendingPool(address1);
  const aaveLendingPoolAddress = await aaveLendingPoolContract.getAddress();

  console.log(`Lending pool address is: ${aaveLendingPoolAddress}`);

  // Depositing on the lending pool
  // First, we need to approve the lending pool to spend our WETH
  const depositAmount = ethers.parseEther("1");
  await approveERC20(
    wethAddress,
    aaveLendingPoolAddress,
    depositAmount,
    address1
  );
  console.log("Depositing...");
  const deposit = await aaveLendingPoolContract.deposit(
    wethAddress,
    depositAmount,
    address1.address,
    0
  );
  await deposit.wait(1);
  console.log("Deposited!");

  // Borrowing from the lending pool
  let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(
    aaveLendingPoolContract,
    address1
  );
  const daiPrice = await getDAIPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / Number(daiPrice));
  const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString());
  console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`);

  await borrowDai(aaveLendingPoolContract, amountDaiToBorrowWei, address1);

  getBorrowUserData(aaveLendingPoolContract, address1);

  // Repaying the loan
  await repay(aaveLendingPoolContract, amountDaiToBorrowWei, address1);
  getBorrowUserData(aaveLendingPoolContract, address1);
}

async function repay(
    aaveLendingPoolContract: any,
  amountDaiToRepay: BigInt,
  account: Signer
) {
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const signerAddress = await account.getAddress();
  const aaveLendingPoolAddress = await aaveLendingPoolContract.getAddress();

  await approveERC20(
    daiAddress,
    aaveLendingPoolAddress,
    amountDaiToRepay,
    account
  );
  const repayTx = await aaveLendingPoolContract.repay(
    daiAddress,
    amountDaiToRepay,
    2,
    signerAddress
  );
  await repayTx.wait(1);
  console.log("You've repaid!");
}

async function borrowDai(
  lendingPoolContract: any,
  amountDaiToBorrow: BigInt,
  account: Signer
) {
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const signerAddress = await account.getAddress();
  const borrowTx = await lendingPoolContract.borrow(
    daiAddress,
    amountDaiToBorrow,
    2,
    0,
    signerAddress
  );
  await borrowTx.wait(1);
  console.log("You've borrowed!");
}

async function getDAIPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
}

async function getLendingPool(account: Signer) {
  const aaveLendingPoolAddressProviderAddress =
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";

  const aaveLendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    aaveLendingPoolAddressProviderAddress,
    account
  );

  const aaveLendingPoolAddress =
    await aaveLendingPoolAddressProvider.getLendingPool();

  const aaveLendingPoolContract = await ethers.getContractAt(
    "ILendingPool",
    aaveLendingPoolAddress,
    account
  );

  return aaveLendingPoolContract;
}

async function approveERC20(
  erc20Address: string,
  spenderAddress: string,
  amountToSpend: any,
  account: Signer
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait();
  console.log("Approved!");
}

async function getBorrowUserData(lendingPoolContract: any, account: Signer) {
  const accountAddress = await account.getAddress();
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPoolContract.getUserAccountData(accountAddress);
  console.log(`Total collateral: ${totalCollateralETH}`);
  console.log(`Total debt: ${totalDebtETH}`);
  console.log(`Available borrows: ${availableBorrowsETH}`);
  return { totalDebtETH, availableBorrowsETH };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
