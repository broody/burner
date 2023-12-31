const {
  Account,
  CallData,
  RpcProvider,
  TransactionStatus,
  ec,
  hash,
  stark,
  json,
} = require("starknet");
const fs = require("fs");

const ETH_CONTRACT_ADDRESS =
  "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
// const ADMIN_ADDRESS = "0x2";
// const PRIVATE_KEY =
//   "0x00c1cf1490de1352865301bb8705143f3ef938f97fdf892f1090dcb5ac7bcd1d";
// const ACCOUNT_CLASS_HASH =
//   "0x006280083f8c2a2db9f737320d5e3029b380e0e820fe24b8d312a6a34fdba0cd";
// const RPC_ENDPOINT = "https://api.cartridge.gg/x/shinai/madara";
const ADMIN_ADDRESS =
  "0x03ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0";
const PRIVATE_KEY =
  "0x0300001800000000300000180000000000030000000000003006001800006600";
const ACCOUNT_CLASS_HASH =
  "0x04d07e40e93398ed3c76981e72dd1fd22557a78ce36c0515f679e27f0bb5bc5f";
const RPC_ENDPOINT = "http://localhost:5050";

const provider = new RpcProvider({
  nodeUrl: RPC_ENDPOINT,
});
const account = new Account(provider, ADMIN_ADDRESS, PRIVATE_KEY);

const genAccount = () => {
  const privateKey = stark.randomAddress();
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const address = hash.calculateContractAddressFromHash(
    publicKey,
    ACCOUNT_CLASS_HASH,
    CallData.compile({ publicKey }),
    0
  );

  return { address, privateKey, publicKey };
};

const createBurner = async () => {
  try {
    const { address, privateKey, publicKey } = genAccount();

    let { transaction_hash: transfer_hash } = await account.execute({
      contractAddress: ETH_CONTRACT_ADDRESS,
      entrypoint: "transfer",
      calldata: CallData.compile([address, "0x16345785D8A0000", "0x0"]),
    });
    console.log("tx: ", transfer_hash);
    await account.waitForTransaction(transfer_hash, {
      retryInterval: 1000,
    });
    console.log("transfered eth to: " + address);

    const burner = new Account(provider, address, privateKey);

    // This fails with "LibraryError: 40: Contract Error"
    const { transaction_hash: deploy_hash, contract_address } =
      await burner.deployAccount({
        classHash: ACCOUNT_CLASS_HASH,
        constructorCalldata: CallData.compile({ publicKey }),
        addressSalt: publicKey,
      });

    const result = await provider.getTransactionReceipt(deploy_hash);
    console.log(result);
    // await provider.waitForTransaction(deploy_hash, {
    //   retryInterval: 1000,
    //   successStates: [TransactionStatus.ACCEPTED_ON_L2],
    // });
    console.log("deployed " + contract_address);
  } catch (e) {
    console.log(e);
    throw e;
  }
};

createBurner();
