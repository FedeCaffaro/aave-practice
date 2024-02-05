import { ethers } from "hardhat";

export async function getWeth() {
  const [address1] = await ethers.getSigners();
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const wethContract = await ethers.getContractAt(
    "IWeth",
    wethAddress,
    address1
  );

  const tx = await wethContract.deposit({ value: ethers.parseEther("1") });
  await tx.wait(1);

  const wethBalance = await wethContract.balanceOf(address1.address);
  console.log(`Got ${ethers.formatUnits(wethBalance, 18)} WETH`);
  return wethBalance;
}
